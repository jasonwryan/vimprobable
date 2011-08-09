/*
    (c) 2009 by Leon Winter
    (c) 2009, 2010 by Hannes Schueller
    (c) 2010 by Hans-Peter Deifel
    see LICENSE file
*/
function Hints() {
    var hintContainer;
    var hintCount;
    var currentFocusNum = 1;

    /* hints[] = [elem, number, text, span, backgroundColor, color] */
    var hints = [];

    this.createHints = function(inputText)
    {
        if (document.getElementsByTagName("body")[0] === null || typeof(document.getElementsByTagName("body")[0]) != "object")
            return;

        var height = window.innerHeight;
        var width = window.innerWidth;
        var scrollX = document.defaultView.scrollX;
        var scrollY = document.defaultView.scrollY;
        _generateHintContainer();

        /* prefixing html: will result in namespace error */
        var hinttags;
        if (typeof(inputText) == "undefined" || inputText == "") {
            hinttags = "//*[@onclick or @onmouseover or @onmousedown or @onmouseup or @oncommand or @class='lk' or @role='link' or @href] | //input[not(@type='hidden')] | //a | //area | //iframe | //textarea | //button | //select";
        } else {
            /* only elements which match the text entered so far */
            hinttags = "//*[(@onclick or @onmouseover or @onmousedown or @onmouseup or @oncommand or @class='lk' or @role='link' or @href) and contains(., '" + inputText + "')] | //input[not(@type='hidden') and contains(., '" + inputText + "')] | //a[contains(., '" + inputText + "')] | //area[contains(., '" + inputText + "')] | //iframe[contains(@name, '" + inputText + "')] | //textarea[contains(., '" + inputText + "')] | //button[contains(@value, '" + inputText + "')] | //select[contains(., '" + inputText + "')]";
        }

        /*
        iterator type isn't suitable here, because: "DOMException NVALID_STATE_ERR:
        The document has been mutated since the result was returned."
        */
        var r = document.evaluate(hinttags, document,
            function(p) {
                return "http://www.w3.org/1999/xhtml";
            }, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        /* generate basic hint element which will be cloned and updated later */
        var hintSpan = document.createElement("span");
        hintSpan.setAttribute("class", "hinting_mode_hint");
        hintSpan.style.position = "absolute";
        hintSpan.style.background = "red";
        hintSpan.style.color = "#fff";
        hintSpan.style.font = "bold 10px monospace";
        hintSpan.style.zIndex = "10000000";

        /* due to the different XPath result type, we will need two counter variables */
        this.hintCount = 0;
        var i;
        this.hints = [];
        for (i = 0; i < r.snapshotLength; i++)
        {
            var elem = r.snapshotItem(i);
            var rect = elem.getBoundingClientRect();
            if (!rect || rect.top > height || rect.bottom < 0 || rect.left > width || rect.right < 0 || !(elem.getClientRects()[0]))
                continue;
            var computedStyle = document.defaultView.getComputedStyle(elem, null);
            if (computedStyle.getPropertyValue("visibility") != "visible" || computedStyle.getPropertyValue("display") == "none")
                continue;
            var leftpos = Math.max((rect.left + scrollX), scrollX);
            var toppos = Math.max((rect.top + scrollY), scrollY);

            /* process elements text */
            var text = _getTextFromElement(elem);

            /* making this block DOM compliant */
            var hint = hintSpan.cloneNode(false);
            hint.setAttribute("id", "vimprobablehint" + this.hintCount);
            hint.style.left = leftpos + "px";
            hint.style.top =  toppos + "px";
            var text = document.createTextNode(this.hintCount + 1);
            hint.appendChild(text);
            hintContainer.appendChild(hint);
            this.hintCount++;
            this.hints.push([elem, this.hintCount, text, hint, elem.style.background, elem.style.color]);
            /* make the link black to ensure it's readable */
            elem.style.color = "#000";
            elem.style.background = "#ff0";
        }
        this.clearFocus();
        this.focusHint(1);
        if (this.hintCount == 1) {
            /* just one hinted element - might as well follow it */
            return this.fire(1);
        }
    };

    /* set focus on hint with given number */
    this.focusHint = function(n)
    {
        /* reset previous focused hint */
        var hint = this.hints[currentFocusNum - 1][0];
        if (typeof(hint) != "undefined") {
            hint.className = hint.className.replace("hinting_mode_hint_focus", "hinting_mode_hint");
            hint.style.background = "#ff0";
        }

        currentFocusNum = n;
        /* allow cycling through hints */
        if (currentFocusNum > this.hintCount) {
            currentFocusNum = 1;
        } else if (currentFocusNum < 1) {
            currentFocusNum = this.hintCount;
        }

        /* mark new hint as focused */
        var hint = this.hints[currentFocusNum - 1][0];
        if (typeof(hint) != "undefined") {
            hint.className = hint.className.replace("hinting_mode_hint", "hinting_mode_hint_focus");
            hint.style.background = "#8f0";
        }
    };

    this.focusNextHint = function()
    {
        this.focusHint(currentFocusNum + 1);
    };

    this.focusPreviousHint = function()
    {
        this.focusHint(currentFocusNum - 1);
    };

    this.updateHints = function(n)
    {
        if (this.hintCount - 1 < n * 10 && typeof(this.hints[n - 1][0]) != "undefined") {
            /* return signal to follow the link */
            return "fire;" + n;
        }
        this.focusHint(n);
    };

    this.clearFocus = function()
    {
        if (document.activeElement && document.activeElement.blur)
            document.activeElement.blur();
    };

    this.clearHints = function()
    {
        for (e in this.hints) {
            var hint = this.hints[e];
            if (typeof(hint[3].className) != "undefined") {
                hint[0].style.background = hint[4];
                hint[0].style.color = hint[5];
            }
        }
        hintContainer.parentNode.removeChild(hintContainer);
        window.onkeyup = null;
    };

    this.fire = function(n)
    {
        if (!n) {
            var n = this.currentFocusNum;
        }
        if (typeof(this.hints[n - 1][0]) == "undefined")
            return;

        var el = this.hints[n - 1][0];
        var tag = el.nodeName.toLowerCase();
        this.clearHints();
        if (tag == "iframe" || tag == "frame" || tag == "textarea" || tag == "input" && (el.type == "text" || el.type == "password" || el.type == "checkbox" || el.type == "radio") || tag == "select") {
            el.focus();
            return;
        }
        if (!el.onclick && el.href && !el.href.match("/^javascript:/")) {
            /* send signal to open link */
            return "open;" + el.href;
        }
        var evObj = document.createEvent("MouseEvents");
        evObj.initMouseEvent("click", true, true, window, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, null);
        el.dispatchEvent(evObj);
    };

    this.focusInput = function()
    {
        if (document.getElementsByTagName("body")[0] === null || typeof(document.getElementsByTagName("body")[0]) != "object")
            return;

        /* prefixing html: will result in namespace error */
        var hinttags = "//input[@type='text'] | //input[@type='password'] | //textarea";
        var r = document.evaluate(hinttags, document,
            function(p) {
                return "http://www.w3.org/1999/xhtml";
            }, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var i;
        var j = 0;
        var k = 0;
        var first = null;
        for (i = 0; i < r.snapshotLength; i++) {
            var elem = r.snapshotItem(i);
            if (k == 0) {
                if (elem.style.display != "none" && elem.style.visibility != "hidden") {
                    first = elem;
                } else {
                    k--;
                }
            }
            if (j == 1 && elem.style.display != "none" && elem.style.visibility != "hidden") {
                elem.focus();
                break;
            }
            if (elem == document.activeElement) {
                j = 1;
            }
            k++;
        }
        /* no appropriate field found focused - focus the first one */
        if (j == 0 && first !== null)
            first.focus();
    };

    function _generateHintContainer()
    {
        var body = document.getElementsByTagName("body")[0];
        if (document.getElementById("hint_container"))
            return;

        hintContainer = document.createElement("div");
        hintContainer.id = "hint_container";

        if (body)
            body.appendChild(hintContainer);
    }

    function _getTextFromElement(elem)
    {
        var tagname = elem.tagName.toLowerCase();
        if (tagname == "input" || tagname == "textarea") {
            text = elem.value;
        } else if (tagname == "select") {
            if (elem.selectedIndex >= 0) {
                text = elem.item(elem.selectedIndex).text;
            } else{
                text = "";
            }
        } else {
            text = elem.textContent;
        }
        return text.toLowerCase();;
    }
}
hints = new Hints();
