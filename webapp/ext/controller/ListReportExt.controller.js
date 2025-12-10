sap.ui.define([
    "sap/m/MessageToast",
    "zsdcreditnote/libs/pdf-lib-wrapper" 
], function(MessageToast, PDFLibPromise) {
    'use strict';

    return {
        Preview: async function(oEvent) {
            var that = this;
            that.getView().setBusy(true);

            let PDFLib;
            try {
                PDFLib = await PDFLibPromise;
            } catch (e) {
                that.getView().setBusy(false);
                sap.m.MessageBox.error("PDF-lib failed to load.");
                return;
            }            

            const selectedItems = oEvent.getSource().getParent().getParent().getSelectedItems();
            const pdfDataArray = [];

            for (let i = 0; i < selectedItems.length; i++) {
                const cells = selectedItems[i].getCells();
                const BillingDocument = cells[0].getText();
            
                const encodedParams = {
                    BillingDocument: encodeURIComponent(BillingDocument)
                };

                const sPath = `/ZC_CREDIT_NOTE('${encodedParams.BillingDocument}')`;
                const sServiceUrl = "/sap/opu/odata/sap/ZSB_CREDIT_NOTE";
                const oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true);

                try {
                    const oData = await new Promise((resolve, reject) => {
                        oModel.read(sPath, {
                            success: resolve,
                            error: reject
                        });
                    });

                    pdfDataArray.push(oData.base64); // Assuming Base64 string
                } catch (error) {
                    that.getView().setBusy(false);
                    sap.m.MessageBox.error("Error fetching PDF file.");
                    return;
                }
            }

            await that.mergeAndPreviewPDFs(pdfDataArray, PDFLib);
            that.getView().setBusy(false);
        },

        mergeAndPreviewPDFs: async function(base64Array, PDFLib) {   
            
            if (!PDFLib || !PDFLib.PDFDocument) {
                sap.m.MessageBox.error("PDF-lib is not available.");
                return;
            }
            const { PDFDocument } = PDFLib;
            // const PDFDocument = window.PDFLib.PDFDocument; // ✅ Fixed here

            const mergedPdf = await PDFDocument.create();
            
            //const mergedPdf = await PDFLib.PDFDocument.create();

            for (let base64 of base64Array) {
                const cleanedBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
                const byteArray = Uint8Array.from(atob(cleanedBase64), c => c.charCodeAt(0));

                const pdfDoc = await PDFLib.PDFDocument.load(byteArray);
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            const blobURL = URL.createObjectURL(blob);

            const printWindow = window.open(blobURL);
            if (printWindow) {
                printWindow.onload = function () {
                    printWindow.focus();
                    printWindow.print();
                };
            } else {
                sap.m.MessageBox.warning("Popup blocked. Please allow popups for PDF preview.");
            }
        }
    };
});
