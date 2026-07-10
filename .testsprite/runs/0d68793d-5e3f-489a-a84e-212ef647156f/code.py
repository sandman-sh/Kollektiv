import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("https://0xkollektiv.vercel.app/")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Type a unique username into the 'Your Name' field and then click the 'NEXT' button on the join panel.
        # E.G. SARAH CHEN text field
        elem = page.get_by_placeholder('E.G. SARAH CHEN', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("User48321")
        
        # -> Type a unique username into the 'Your Name' field and then click the 'NEXT' button on the join panel.
        # Type a unique username into the 'Your Name' field and then click the 'NEXT' button on the join panel.
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/form/div[2]/div')
        await elem.click(timeout=10000)
        
        # -> Click the 'NEXT' button on the join panel to proceed to the PIN entry step.
        # NEXT button
        elem = page.get_by_role('button', name='NEXT', exact=True)
        await elem.click(timeout=10000)
        
        # -> Enter digits 1, 2, 3, 4 into the 'Set PIN' fields (the four boxes under "SET PIN").
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[2]/div/input')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1")
        
        # -> Enter digits 1, 2, 3, 4 into the 'Set PIN' fields (the four boxes under "SET PIN").
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[2]/div/input[2]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2")
        
        # -> Enter digits 1, 2, 3, 4 into the 'Set PIN' fields (the four boxes under "SET PIN").
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[2]/div/input[3]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("3")
        
        # -> Enter digits 1, 2, 3, 4 into the 'Set PIN' fields (the four boxes under "SET PIN").
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[2]/div/input[4]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("4")
        
        # -> Enter '1', '2', '3', '4' into the Confirm PIN fields and then click the 'CREATE & ENTER' button.
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[3]/div/input')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1")
        
        # -> Enter '1', '2', '3', '4' into the Confirm PIN fields and then click the 'CREATE & ENTER' button.
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[3]/div/input[2]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("2")
        
        # -> Enter '1', '2', '3', '4' into the Confirm PIN fields and then click the 'CREATE & ENTER' button.
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[3]/div/input[3]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("3")
        
        # -> Enter '1', '2', '3', '4' into the Confirm PIN fields and then click the 'CREATE & ENTER' button.
        # password field
        elem = page.locator('xpath=/html/body/div/div/div/div[11]/div[2]/div/div[2]/div[3]/div/input[4]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("4")
        
        # -> Enter '1', '2', '3', '4' into the Confirm PIN fields and then click the 'CREATE & ENTER' button.
        # CREATE & ENTER button
        elem = page.locator("xpath=/html/body/div/div/div/div[11]/div[2]/div[1]/div[2]/div[4]/button[2]").nth(0)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the browser URL redirects to /canvas
        # Assert: Browser URL includes '/canvas', confirming a redirect to the canvas.
        await expect(page).to_have_url(re.compile("/canvas"), timeout=15000), "Browser URL includes '/canvas', confirming a redirect to the canvas."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    