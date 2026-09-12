import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] || 'eplan-download');
const year = process.argv[3] || '2027';
if (!/^20\d{2}$/.test(year)) throw new Error('Fiscal year must be a four-digit year.');
const programs = [
  ['title-1-a', 'Title I, Part A'],
  ['title-1-neglected', 'Title I, Part A-Neglected'],
  ['title-1-d', 'Title I, Part D LEA'],
  ['title-2-a', 'Title II, Part A'],
  ['title-4', 'Title IV'],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.EPLAN_BROWSER_CHANNEL ? { channel: process.env.EPLAN_BROWSER_CHANNEL } : {}) });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  await page.goto('https://eplan.tn.gov/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Search', exact: true }).click();
  await page.locator('#ctl00_CCIPContentPlaceHolder_txtDistrictName').fill('Knox');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Knox County Schools', exact: true }) }).getByRole('link', { name: 'FA', exact: true }).click();
  const yearSelect = page.locator('#ctl00_CCIPContentPlaceHolder_ddlFiscalYear');
  await yearSelect.waitFor();
  if ((await yearSelect.locator('option:checked').innerText()).trim() !== year) {
    await Promise.all([page.waitForEvent('load'), yearSelect.selectOption({ label: year })]);
  }
  const statusSelect = page.locator('#ctl00_CCIPContentPlaceHolder_ddlApplicationStatus');
  if (await statusSelect.inputValue() !== 'AllApprovedApplications') {
    await Promise.all([page.waitForEvent('load'), statusSelect.selectOption('AllApprovedApplications')]);
  }
  await page.getByRole('link', { name: 'Consolidated', exact: true }).first().waitFor();
  const applications = await page.getByRole('link', { name: 'Consolidated', exact: true }).evaluateAll(links => links.map(link => ({
    id: link.id, cells: [...link.closest('tr').cells].map(cell => cell.innerText.trim()),
  })));
  // The approved-applications table has application name, due date, revision, status and date.

  const approved = applications.map(app => ({ ...app, revision: Number(app.cells[2]) }))
    .filter(app => Number.isInteger(app.revision) && app.cells.some(cell => /^TDOE FPO Director Approved$/.test(cell)))
    .sort((a, b) => b.revision - a.revision);
  if (!approved.length) throw new Error('No approved Consolidated application found; nothing was updated.');
  await page.locator(`#${approved[0].id}`).click();
  await page.locator('[id$="_lblSectionName"]').first().waitFor();
  const header = await page.locator('#ctl00_lblPageHeader').innerText();
  if (!header.includes(`Knox County Schools (470) Public District - FY ${year} - Consolidated - Rev ${approved[0].revision}`)) throw new Error(`Unexpected source: ${header}`);
  const status = await page.locator('#ctl00_CCIPContentPlaceHolder_lblApplicationStatus').innerText();
  if (status.trim() !== 'TDOE FPO Director Approved') throw new Error('The selected application is not approved.');

  for (const [id, name] of programs) {
    if (id !== programs[0][0]) {

      await page.locator('a').filter({hasText:/^Funding$/}).hover();
      await page.locator('a').filter({hasText:/^Sections$/}).first().click();
    }
    const heading = page.locator('[id$="_lblSectionName"]').filter({ hasText: new RegExp(`^${name}$`) });
    await heading.waitFor({state: 'attached'});
    const prefix = (await heading.getAttribute('id')).replace(/_lblSectionName$/, '');
    await page.locator(`a[id^="${prefix}_rptSectionPages_"]`).filter({ hasText: /^Budget$/ }).click();
    const downloadLink = page.locator('#ctl00_CCIPContentPlaceHolder_lnkDownloadBudget');
    await downloadLink.waitFor();
    const budgetHeader = await page.locator('#ctl00_lblPageHeader').innerText();
    if (budgetHeader !== `${header} - ${name}`) throw new Error(`Wrong program selected: ${budgetHeader}`);
    const href = new URL(await downloadLink.getAttribute('href'), page.url());
    if (href.origin !== 'https://eplan.tn.gov') throw new Error('Unexpected download host.');
    const response = await page.request.get(href.href, { timeout: 60000 });
    const bytes = await response.body();
    if (!response.ok() || !bytes.subarray(0, 2).equals(Buffer.from('PK')) || bytes.length > 20_000_000) throw new Error(`Invalid budget export for ${name}`);
    await writeFile(resolve(output, `${id}.xlsx`), bytes);
    console.log(`Downloaded ${name}: ${bytes.length} bytes`);
  }
  const applicationDate = approved[0].cells[4];
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(applicationDate)) throw new Error('The approved Consolidated application date is missing or invalid.');
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ schemaVersion: 1, district: 'Knox County Schools', districtCode: '470', year: Number(year), application: 'Consolidated', applicationDate, revision: approved[0].revision, status: status.trim(), checkedAt: new Date().toISOString(), source: 'https://eplan.tn.gov/', programs: programs.map(([id, name]) => ({ id, name })) }, null, 2) + '\n');
} finally {
  await browser.close();
}
