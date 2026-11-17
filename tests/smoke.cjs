const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const htmlPath = path.resolve("index.html");
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  fs.createReadStream(htmlPath).pipe(res);
});

(async () => {
  const errors = [];
  let browser;
  await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173/index.html");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    if (!(await page.locator("#home.active").count())) throw new Error("Beranda tidak tampil.");
    await page.locator("#menuSettings").click();
    await page.locator("#musicVolume").fill("27");
    await page.locator("#musicToggle").uncheck();
    await page.locator("#doneSettings").click();
    await page.locator("#menuPlay").click();
    await page.locator("#achievementOk").click();

    for (let chapter = 0; chapter < 5; chapter++) {
      for (let scene = 0; scene < 5; scene++) {
        if (chapter === 0) {
          await page.locator("#interaction .choice").first().click();
        } else if (chapter === 1) {
          for (const [option, rank] of [[0, "1"], [1, "2"], [2, "3"]]) {
            await page.locator('.rankSelect[data-option="' + option + '"]').selectOption(rank);
          }
          await page.locator("#rankSubmit").click();
        } else if (chapter === 2) {
          await page.locator("#oppChoice").selectOption("0");
          await page.locator("#oppForegone").selectOption("1");
          await page.locator("#oppSubmit").click();
        } else if (chapter === 3) {
          await page.locator("#allocSubmit").click();
        } else {
          await page.locator(".auditChoice[data-choice='0']").click();
          await page.locator(".auditCheck").first().check();
          await page.locator(".auditCheck").nth(1).check();
          await page.locator(".auditCheck").nth(2).check();
          await page.locator("#auditSubmit").click();
        }

        await page.locator("#feedback.show").waitFor();
        await page.locator("#nextBtn").click();

        if (chapter === 4 && scene === 4) break;
        if (await page.locator("#achievementShade.open").count()) {
          await page.locator("#achievementOk").click();
        }
      }
    }

    await page.locator("#endingReplay").waitFor({ timeout: 5000 });
    const contacts = await page.locator("#credits a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    for (const expected of [
      "tel:+62895320599887",
      "https://wa.me/qr/S6S23M26XBVGO1?s=v",
      "mailto:ridhoamim.al@gmail.com"
    ]) {
      if (!contacts.includes(expected)) throw new Error("Tautan profil tidak ditemukan: " + expected);
    }
    if (errors.length) throw new Error("JavaScript runtime errors: " + errors.join(" | "));
    console.log("PASS: full 25-scene flow, all five chapter modes, ending and contact links.");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
