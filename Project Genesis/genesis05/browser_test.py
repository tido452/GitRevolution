import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  await page.set_content(Path('/mnt/data/genesis05_package/genesis_lab_05.html').read_text(),wait_until='load')
  print('ready:',await page.locator('#status').inner_text(),'errors',errors)
  await page.locator('#discover').click()
  await page.wait_for_function("document.getElementById('sourceMeta').textContent.includes('독립 시험')",timeout=60000)
  print('source:',await page.locator('#sourceFormula').inner_text(),await page.locator('#sourceMeta').inner_text())
  await page.locator('#save').click()
  print('macro:',await page.locator('#macroFormula').inner_text())
  await page.locator('#transfer').click()
  await page.wait_for_function("document.getElementById('coldAcc').textContent.includes('%')",timeout=60000)
  print('scores:',await page.locator('#coldAcc').inner_text(),await page.locator('#warmAcc').inner_text(),await page.locator('#delta').inner_text())
  print('expr:',await page.locator('#coldExpr').inner_text(),await page.locator('#warmExpr').inner_text())
  await page.screenshot(path='/mnt/data/genesis05_package/genesis05_preview.png',full_page=True)
  async with page.expect_download() as d:
   await page.locator('#export').click()
  dl=await d.value
  print('csv:',dl.suggested_filename)
  await page.set_viewport_size({'width':390,'height':844})
  await page.screenshot(path='/mnt/data/genesis05_package/genesis05_mobile.png',full_page=True)
  print('mobile:',await page.evaluate('document.documentElement.scrollWidth'),await page.evaluate('window.innerWidth'))
  print('errors',errors)
  await browser.close()
asyncio.run(main())
