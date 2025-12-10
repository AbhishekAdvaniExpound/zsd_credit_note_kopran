sap.ui.define(
  ["sap/m/MessageToast", "zsdcreditnote/libs/pdf-lib-wrapper"],
  function (MessageToast, PDFLibPromise) {
    "use strict";

    return {
      Preview: async function (oEvent) {
        var that = this;
        that.getView().setBusy(true);

        let PDFLib;
        try {
          PDFLib = await PDFLibPromise;
        } catch (e) {
          that.getView().setBusy(false);
          sap.m.MessageBox.error("PDF-lib failed to load.");
          console.error("PDF-lib load error:", e);
          return;
        }

        let selectedItems;
        try {
          selectedItems = oEvent
            .getSource()
            .getParent()
            .getParent()
            .getSelectedItems();
        } catch (e) {
          that.getView().setBusy(false);
          sap.m.MessageBox.error("Could not get selected items.");
          console.error("Selected items error:", e);
          return;
        }

        if (!selectedItems || selectedItems.length === 0) {
          that.getView().setBusy(false);
          sap.m.MessageBox.warning("No items selected for Print Preview.");
          console.warn("Print Preview: No items selected.");
          return;
        }

        const pdfDataArray = [];
        const oComponent = that.getOwnerComponent();
        const oModel =
          oComponent.getModel("mainService") || oComponent.getModel();

        if (!oModel) {
          that.getView().setBusy(false);
          sap.m.MessageBox.error("OData model not available.");
          console.error("OData model not found");
          return;
        }

        for (let i = 0; i < selectedItems.length; i++) {
          try {
            const oContext = selectedItems[i].getBindingContext();
            const BillingDocument = oContext.getProperty("BillingDocument");
            console.log("Fetching PDF for BillingDocument:", BillingDocument);

            const sPath = `/ZC_CREDIT_NOTE('${BillingDocument}')`;
            const oData = await new Promise((resolve, reject) => {
              oModel.read(sPath, {
                success: function (data) {
                  console.log("OData read success:", data);
                  resolve(data);
                },
                error: function (error) {
                  console.error("OData read error:", error);
                  reject(error);
                },
              });
            });

            if (!oData) {
              throw new Error(
                "No data returned for BillingDocument " + BillingDocument
              );
            }

            var pdfBase64 = oData.base64_3 || oData.base64;
            if (!pdfBase64) {
              throw new Error(
                "No PDF data found in base64_3 or base64 field for BillingDocument " +
                  BillingDocument
              );
            }
            console.log("PDF data found, adding to array");
            pdfDataArray.push(pdfBase64);
          } catch (error) {
            that.getView().setBusy(false);
            sap.m.MessageBox.error(
              "Error fetching PDF file for item " + (i + 1) + "."
            );
            console.error("Error fetching PDF file for item", i + 1, error);
            return;
          }
        }

        try {
          await that.mergeAndPreviewPDFs(pdfDataArray, PDFLib);
        } catch (e) {
          sap.m.MessageBox.error("Error merging or previewing PDFs.");
          console.error("PDF merge/preview error:", e);
        }
        that.getView().setBusy(false);
      },

      PrintPreview2: async function (oEvent) {
        sap.m.MessageBox.information("PRINTPREVIEW2 button clicked!");
        console.log("PrintPreview2 handler executed");
      },

      mergeAndPreviewPDFs: async function (base64Array, PDFLib) {
        if (!PDFLib || !PDFLib.PDFDocument) {
          sap.m.MessageBox.error("PDF-lib is not available.");
          console.error("PDF-lib is not available.", PDFLib);
          return;
        }
        const { PDFDocument } = PDFLib;

        let mergedPdf;
        try {
          mergedPdf = await PDFDocument.create();
        } catch (e) {
          sap.m.MessageBox.error("Could not create merged PDF document.");
          console.error("PDFDocument.create error:", e);
          return;
        }

        for (let i = 0; i < base64Array.length; i++) {
          try {
            const base64 = base64Array[i];
            const cleanedBase64 = base64.replace(
              /^data:application\/pdf;base64,/,
              ""
            );
            const byteArray = Uint8Array.from(atob(cleanedBase64), (c) =>
              c.charCodeAt(0)
            );
            const pdfDoc = await PDFLib.PDFDocument.load(byteArray);
            const pages = await mergedPdf.copyPages(
              pdfDoc,
              pdfDoc.getPageIndices()
            );
            pages.forEach((page) => mergedPdf.addPage(page));
          } catch (e) {
            sap.m.MessageBox.error(
              "Error loading or copying PDF for item " + (i + 1) + "."
            );
            console.error("PDF load/copy error for item", i + 1, e);
            return;
          }
        }

        let mergedBytes, blob, blobURL, printWindow;
        try {
          mergedBytes = await mergedPdf.save();
          blob = new Blob([mergedBytes], { type: "application/pdf" });
          blobURL = URL.createObjectURL(blob);
          printWindow = window.open(blobURL);
        } catch (e) {
          sap.m.MessageBox.error("Error preparing PDF for preview.");
          console.error("PDF preview preparation error:", e);
          return;
        }

        if (printWindow) {
          printWindow.onload = function () {
            try {
              printWindow.focus();
              printWindow.print();
            } catch (e) {
              sap.m.MessageBox.error("Error printing PDF preview.");
              console.error("PrintWindow print error:", e);
            }
          };
        } else {
          sap.m.MessageBox.warning(
            "Popup blocked. Please allow popups for PDF preview."
          );
          console.warn("Popup blocked for PDF preview.");
        }
      },
    };
  }
);
