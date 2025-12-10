sap.ui.define([], function () {
    return new Promise(function (resolve, reject) {
        if (window.PDFLib) {
            resolve(window.PDFLib);
            return;
        }

        var script = document.createElement("script");
        script.src = sap.ui.require.toUrl("zsdcreditnote/libs/pdf-lib.min.js"); // ⬅️ FIX THIS PATH
        script.onload = function () {
            if (window.PDFLib) {
                resolve(window.PDFLib);
            } else {
                reject("PDFLib is not defined after script load.");
            }
        };
        script.onerror = function () {
            reject("Failed to load PDFLib.");
        };
        document.head.appendChild(script);
    });
});
