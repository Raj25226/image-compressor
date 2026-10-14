import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function image(page: Page, transparent = false) {
  return page.evaluate(async transparent => {
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;
    const ctx=canvas.getContext('2d')!;const pixels=ctx.createImageData(600,400);let seed=123456;
    const randomByte=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed&255;};
    for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=randomByte();pixels.data[i+1]=randomByte();pixels.data[i+2]=randomByte();pixels.data[i+3]=transparent && i < 600*4*100 ? 0:255;}
    ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png').split(',')[1];
  },transparent);
}
async function upload(page:Page,transparent=false){await page.locator('input[type=file]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from(await image(page,transparent),'base64')});await expect(page.getByRole('button',{name:'Compress image',exact:true})).toBeEnabled();}

test('compresses locally and download bytes match the displayed result',async({page})=>{
 const uploads:string[]=[];page.on('request',request=>{if(['POST','PUT','PATCH'].includes(request.method()))uploads.push(request.url());});
 await page.goto('/');await page.screenshot({path:'test-results/desktop.png',fullPage:true});await upload(page);await page.getByLabel('Output format').selectOption('image/jpeg');await page.getByRole('button',{name:'20 KB',exact:true}).click();await page.getByRole('button',{name:'Compress image',exact:true}).click();
 await expect(page.locator('.result-panel')).toBeVisible();await expect(page.locator('.status')).toHaveText('Target reached');
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'Download image',exact:true}).click();const download=await event;const bytes=await readFile((await download.path())!);
 expect(bytes.length).toBeLessThanOrEqual(20480);expect(bytes[0]).toBe(255);expect(bytes[1]).toBe(216);expect(download.suggestedFilename()).toBe('sample-compressed.jpg');
 await expect(page.locator('.download-row')).toContainText(`${(bytes.length/1024).toFixed(1)} KB`);expect(uploads).toEqual([]);
});
test('preserves PNG transparency and reports an unattainable target honestly',async({page})=>{
 await page.goto('/');await upload(page,true);await page.getByRole('checkbox').uncheck();await page.getByLabel('Target file size').fill('1');await page.getByRole('button',{name:'Compress image',exact:true}).click();
 await expect(page.locator('.result-panel')).toBeVisible();await expect(page.locator('.status')).toHaveText('Target not reached');
 const alpha=await page.getByAltText('Compressed result preview').evaluate(async(el:HTMLImageElement)=>{await el.decode();const canvas=document.createElement('canvas');canvas.width=el.naturalWidth;canvas.height=el.naturalHeight;const ctx=canvas.getContext('2d')!;ctx.drawImage(el,0,0);return ctx.getImageData(1,1,1,1).data[3];});expect(alpha).toBe(0);
});
test('rejects corrupt input and unsupported formats',async({page})=>{
 await page.goto('/');await page.locator('input[type=file]').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid')});await expect(page.locator('#compressor').getByRole('alert')).toContainText('unsupported or damaged');
 await page.locator('input[type=file]').setInputFiles({name:'vector.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await expect(page.locator('#compressor').getByRole('alert')).toContainText('JPEG, PNG, or WebP');
});
test('rejects images over the input byte limit',async({page})=>{
 await page.goto('/');await page.locator('input[type=file]').setInputFiles({name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(20*1024*1024+1)});await expect(page.locator('#compressor').getByRole('alert')).toContainText('20 MB');
});
test('allows retry after invalid target and replacement with another image',async({page})=>{
 await page.goto('/');await upload(page);await page.getByLabel('Target file size').fill('0');await page.getByRole('button',{name:'Compress image',exact:true}).click();await expect(page.locator('#compressor').getByRole('alert')).toContainText('Enter a target');
 await page.getByLabel('Target file size').fill('100');await page.getByRole('button',{name:'Compress image',exact:true}).click();await expect(page.locator('.result-panel')).toBeVisible();await page.getByRole('button',{name:'Remove image'}).click();await expect(page.locator('.result-panel')).not.toBeVisible();await upload(page);
});
test('works without Worker and OffscreenCanvas',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'Worker',{value:undefined});Object.defineProperty(window,'OffscreenCanvas',{value:undefined});});
 await page.goto('/');await upload(page);await page.getByLabel('Output format').selectOption('image/jpeg');await page.getByRole('button',{name:'50 KB',exact:true}).click();await page.getByRole('button',{name:'Compress image',exact:true}).click();await expect(page.locator('.result-panel')).toBeVisible();
});
test('target pages have distinct content, correct defaults, and mobile layout',async({page})=>{
 const headings=[];
 for(const kb of [20,50,100,200]){await page.goto(`/image-compressor-${kb}kb/`);await expect(page.getByLabel('Target file size')).toHaveValue(String(kb));headings.push(await page.locator('.guide h2').textContent());await expect(page).toHaveTitle(new RegExp(`${kb} KB`));}
 expect(new Set(headings).size).toBe(4);
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:375,height:900});await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 await page.goto('/privacy/');await expect(page.getByRole('heading',{name:'Your images are yours.'})).toBeVisible();
});
test('keyboard controls and JPEG warning are accessible',async({page})=>{
 await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.getByLabel('Output format').selectOption('image/jpeg');await expect(page.getByText(/JPEG removes transparency/)).toBeVisible();
});

test('accepts JPEG and WebP inputs and offers already-small originals',async({page})=>{
 await page.goto('/');
 for(const format of ['image/jpeg','image/webp']){
  const data=await page.evaluate(format=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#31775a';ctx.fillRect(0,0,80,60);return canvas.toDataURL(format).split(',')[1];},format);
  await page.locator('input[type=file]').setInputFiles({name:format==='image/jpeg'?'small.jpg':'small.webp',mimeType:format,buffer:Buffer.from(data,'base64')});
  await page.getByRole('button',{name:'Compress image',exact:true}).click();await expect(page.locator('.result-panel')).toBeVisible();await expect(page.locator('.status')).toHaveText('Target reached');await expect(page.getByRole('link',{name:'Download original',exact:true})).toBeVisible();
 }
});
test('can cancel without losing the original and retry',async({page})=>{
 await page.goto('/');await upload(page);await page.getByLabel('Target file size').fill('1');await page.getByRole('button',{name:'Compress image',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('.tool-error')).toContainText('cancelled');await expect(page.getByAltText('Selected file preview')).toBeVisible();await expect(page.getByRole('button',{name:'Compress image',exact:true})).toBeEnabled();
});

test('keeps a resized PNG close to the 200 KB budget', async ({ page }) => {
  await page.goto('/');
  await upload(page);
  await page.getByRole('button', { name: '200 KB', exact: true }).click();
  await page.getByRole('button', { name: 'Compress image', exact: true }).click();
  await expect(page.locator('.result-panel')).toBeVisible();
  await expect(page.locator('.status')).toHaveText('Target reached');
  const event = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download image', exact: true }).click();
  const bytes = await readFile((await (await event).path())!);
  expect(bytes.length).toBeLessThanOrEqual(200 * 1024);
  expect(bytes.length).toBeGreaterThan(195 * 1024);
  expect(bytes[0]).toBe(137);
});
