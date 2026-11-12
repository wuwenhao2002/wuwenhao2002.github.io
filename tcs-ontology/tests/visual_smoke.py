"""Real-browser smoke test for the interactive Paper-driven Research Graph.

Run with a local HTTP server for tcs-ontology:
  python -m playwright install chromium
  python -m http.server --directory tcs-ontology 8765 &
  python tcs-ontology/tests/visual_smoke.py
"""
from __future__ import annotations
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT / "visual-test-output"
OUT.mkdir(exist_ok=True)
URL="http://127.0.0.1:8765/map.html"

def inspect(page,mode):
    errors=[]
    page.on("pageerror",lambda exc:errors.append(str(exc)))
    page.goto(URL,wait_until="domcontentloaded",timeout=25000)
    page.wait_for_function("document.querySelector('#mapCounter')?.textContent.includes('INDEX /')",timeout=25000)
    page.evaluate("document.fonts.ready")
    assert page.locator("#mapCanvas").evaluate("(el)=>el.width>0&&el.height>0"),"Map Canvas not sized"
    count=int(page.locator("#primitiveResultsCount").inner_text().replace(",",""))
    assert count>=690,("Incomplete map primitive index",count)
    assert page.locator("#mapMatches button").count()>0
    page.screenshot(path=str(OUT/f"{mode}-unselected.png"),full_page=True,animations="disabled")

    page.locator('[data-primitive="lens.prediction"]').click()
    page.wait_for_function("document.querySelectorAll('#selectedChips button').length===1")
    first=int(page.locator("#paperCount").inner_text().replace(",",""))
    assert first>0,"Selecting prediction did not show any matching paper"
    page.screenshot(path=str(OUT/f"{mode}-prediction.png"),full_page=True,animations="disabled")

    search=page.locator("#mapSearch")
    search.fill("Ski Rental")
    results=page.locator("#mapMatches button")
    assert results.count()>0,"Can't search for Ski Rental"
    results.first.click()
    page.wait_for_function("document.querySelectorAll('#selectedChips button').length===2")
    second=int(page.locator("#paperCount").inner_text().replace(",",""))
    assert 0<second<=first,("Incorrect intersection semantics",first,second)
    page.screenshot(path=str(OUT/f"{mode}-multi-selected.png"),full_page=True,animations="disabled")

    page.locator("#clearSelection").click()
    page.wait_for_function("document.querySelectorAll('#selectedChips button').length===0")
    assert page.locator("#paperCount").inner_text()=="—","Clear all did not restore empty state"
    assert not errors,"Unexpected runtime errors: "+repr(errors)
    return {"primitive_index":count,"prediction_papers":first,"prediction_and_ski_rental":second}

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
        desktop=browser.new_page(viewport={"width":1600,"height":980},device_scale_factor=1)
        result1=inspect(desktop,"desktop")
        mobile=browser.new_page(viewport={"width":390,"height":844},device_scale_factor=1,has_touch=True,is_mobile=True)
        result2=inspect(mobile,"mobile")
        browser.close()
        print("Real-browser map smoke tests passed:",result1,result2)

if __name__=="__main__":
    main()
