/** @type {import('playwright').PlaywrightTestConfig} */
module.exports = {
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:8000",
    headless: true
  },
  webServer: {
    command: "py -m http.server 8000",
    url: "http://127.0.0.1:8000/index.html",
    reuseExistingServer: true,
    timeout: 30000
  }
};
