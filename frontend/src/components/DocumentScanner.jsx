// frontend/src/components/DocumentScanner.jsx

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Set the workerSrc for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function DocumentScanner() {
  const [cvReady, setCvReady] = useState(false);
  const [status, setStatus] = useState('Waiting for OpenCV...');
  const [srcDataUrl, setSrcDataUrl] = useState(null);
  const [processedDataUrl, setProcessedDataUrl] = useState(null);

  const srcImageRef = useRef(null);
  const hiddenSrcCanvasRef = useRef(null);
  const resultCanvasRef = useRef(null);

  useEffect(() => {
    const handleReady = () => {
      setCvReady(true);
      setStatus('OpenCV ready');
    };
    window.addEventListener('opencv-ready', handleReady);
    if (window.cv && window.cv.onRuntimeInitialized) {
      handleReady();
    }
    return () => window.removeEventListener('opencv-ready', handleReady);
  }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.type === 'application/pdf') {
      setStatus('Processing PDF...');
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const loadingTask = pdfjsLib.getDocument({ data: ev.target.result });
        try {
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;

          const dataUrl = canvas.toDataURL('image/png');
          setSrcDataUrl(dataUrl);
          setProcessedDataUrl(null);
          setStatus('PDF page loaded. Ready to process.');
        } catch (error) {
          console.error('Error loading PDF:', error);
          setStatus('Error loading PDF.');
        }
      };
      reader.readAsArrayBuffer(f);
    } else if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSrcDataUrl(ev.target.result);
        setProcessedDataUrl(null);
        setStatus('Image loaded. Ready to process.');
      };
      reader.readAsDataURL(f);
    } else {
      setStatus('Unsupported file type. Please upload an image or PDF.');
    }
  };

  const downloadResult = () => {
    if (!processedDataUrl) return;
    const a = document.createElement('a');
    a.href = processedDataUrl;
    a.download = 'scanned.png';
    a.click();
  };

  function imgToMat(imgElem) {
    const canvas = hiddenSrcCanvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = imgElem.naturalWidth;
    canvas.height = imgElem.naturalHeight;
    ctx.drawImage(imgElem, 0, 0);
    return cv.imread(canvas);
  }

  const process = async () => {
    if (!cvReady) {
      setStatus('OpenCV not ready');
      return;
    }
    if (!srcImageRef.current) {
      setStatus('No source image');
      return;
    }

    setStatus('Processing...');
    await new Promise((r) => setTimeout(r, 50));

    let src = null;
    let gray = null;
    let blurred = null;
    let edged = null;
    let contours = null;
    let hierarchy = null;
    let docContour = null;
    let warped = null;
    let deskewed = null;
    let enhanced = null;

    try {
      src = imgToMat(srcImageRef.current);
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      blurred = new cv.Mat();
      const ksize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

      edged = new cv.Mat();
      cv.Canny(blurred, edged, 50, 150);

      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4) {
          const area = cv.contourArea(approx);
          if (area > maxArea) {
            maxArea = area;
            if (docContour) docContour.delete();
            docContour = approx.clone();
          }
        }
        approx.delete();
        cnt.delete();
      }

      if (!docContour) {
        let largest = null;
        maxArea = 0;
        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          if (area > maxArea) {
            maxArea = area;
            if (largest) largest.delete();
            largest = cnt.clone();
          }
          cnt.delete();
        }
        if (largest) {
          const rect = cv.boundingRect(largest);
          docContour = cv.matFromArray(4, 1, cv.CV_32SC2, [
            rect.x, rect.y,
            rect.x + rect.width, rect.y,
            rect.x + rect.width, rect.y + rect.height,
            rect.x, rect.y + rect.height
          ]);
          largest.delete();
        }
      }

      if (docContour && docContour.rows === 4) {
        const pts = [];
        for (let i = 0; i < 4; i++) {
          const x = docContour.intAt(i, 0);
          const y = docContour.intAt(i, 1);
          pts.push({ x, y });
        }

        pts.sort((a, b) => a.x + a.y - (b.x + b.y));
        const tl = pts[0];
        const br = pts[3];
        const [p1, p2] = [pts[1], pts[2]].sort((a, b) => a.x - b.x);
        const tr = p1;
        const bl = p2;

        const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
        const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        const maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));

        const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
        const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
        const maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));

        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          tl.x, tl.y,
          tr.x, tr.y,
          br.x, br.y,
          bl.x, bl.y
        ]);
        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          maxWidth - 1, 0,
          maxWidth - 1, maxHeight - 1,
          0, maxHeight - 1
        ]);

        warped = new cv.Mat();
        const M = cv.getPerspectiveTransform(srcTri, dstTri);
        const dsize = new cv.Size(maxWidth, maxHeight);
        cv.warpPerspective(src, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        srcTri.delete(); dstTri.delete(); M.delete();
      } else {
        warped = src.clone();
      }

      {
        let wgray = new cv.Mat();
        cv.cvtColor(warped, wgray, cv.COLOR_RGBA2GRAY);
        let thresh = new cv.Mat();
        cv.threshold(wgray, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

        let cnts = new cv.MatVector();
        let h2 = new cv.Mat();
        cv.findContours(thresh, cnts, h2, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        let largestC = null;
        let largestA = 0;
        for (let i = 0; i < cnts.size(); i++) {
          const c = cnts.get(i);
          const a = cv.contourArea(c);
          if (a > largestA) {
            largestA = a;
            if (largestC) largestC.delete();
            largestC = c.clone();
          }
          c.delete();
        }
        if (largestC) {
          const rotRect = cv.minAreaRect(largestC);
          const angle = rotRect.angle;
          const center = rotRect.center;
          const Mrot = cv.getRotationMatrix2D(center, angle, 1);
          const sz = new cv.Size(warped.cols, warped.rows);
          deskewed = new cv.Mat();
          cv.warpAffine(warped, deskewed, Mrot, sz, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
          Mrot.delete();
        } else {
          deskewed = warped.clone();
        }
        wgray.delete(); thresh.delete(); cnts.delete(); h2.delete();
        if (largestC) largestC.delete();
      }

      const denoised = new cv.Mat();
      cv.GaussianBlur(deskewed, denoised, new cv.Size(3, 3), 0);

      const gray2 = new cv.Mat();
      cv.cvtColor(denoised, gray2, cv.COLOR_RGBA2GRAY);
      const eq = new cv.Mat();
      cv.equalizeHist(gray2, eq);

      const eqColor = new cv.Mat();
      cv.cvtColor(eq, eqColor, cv.COLOR_GRAY2RGBA);

      const kernel = cv.matFromArray(3, 3, cv.CV_32F, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
      const sharpen = new cv.Mat();
      cv.filter2D(eqColor, sharpen, cv.CV_8U, kernel);

      enhanced = new cv.Mat();
      const alpha = 0.9;
      const beta = 0.1;
      cv.addWeighted(sharpen, alpha, deskewed, beta, 0, enhanced);

      const maxW = 1024;
      let finalMat = enhanced;
      if (enhanced.cols > maxW) {
        const scale = maxW / enhanced.cols;
        const newH = Math.round(enhanced.rows * scale);
        const resized = new cv.Mat();
        cv.resize(enhanced, resized, new cv.Size(maxW, newH), 0, 0, cv.INTER_AREA);
        finalMat = resized;
      }

      const dstCanvas = resultCanvasRef.current;
      cv.imshow(dstCanvas, finalMat);

      const dataUrl = dstCanvas.toDataURL('image/png');
      setProcessedDataUrl(dataUrl);
      setStatus('Done — processed image ready.');

      if (finalMat !== enhanced) finalMat.delete();

      denoised.delete(); gray2.delete(); eq.delete(); eqColor.delete();
      sharpen.delete(); kernel.delete();
    } catch (err) {
      console.error('Processing error:', err);
      setStatus('Error during processing: ' + (err.message || err));
    } finally {
      try { if (src) src.delete(); } catch {}
      try { if (gray) gray.delete(); } catch {}
      try { if (blurred) blurred.delete(); } catch {}
      try { if (edged) edged.delete(); } catch {}
      try { if (contours) contours.delete(); } catch {}
      try { if (hierarchy) hierarchy.delete(); } catch {}
      try { if (docContour) docContour.delete(); } catch {}
      try { if (warped) warped.delete(); } catch {}
      try { if (deskewed && deskewed !== warped) deskewed.delete(); } catch {}
      try { if (enhanced && enhanced.delete) enhanced.delete(); } catch {}
    }
  };

  return (
    <div className="flex justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-4xl p-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Document Scanner — OpenCV.js</h1>
        <p className="text-center text-gray-500 mb-6">Auto-crop, deskew, enhance (all in browser)</p>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4 mb-4">
          <input 
            type="file" 
            accept="image/*,application/pdf"
            onChange={onFile}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              className="w-full md:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={process}
              disabled={!cvReady || !srcDataUrl}
            >
              Process
            </button>
            <button
              className="w-full md:w-auto px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => { setSrcDataUrl(null); setProcessedDataUrl(null); setStatus('Ready'); }}
            >
              Reset
            </button>
            <button
              className="w-full md:w-auto px-4 py-2 text-sm font-medium text-green-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={downloadResult}
              disabled={!processedDataUrl}
            >
              Download
            </button>
          </div>
        </div>

        <div className="text-sm font-medium text-gray-600 mb-6">{status}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50 flex flex-col items-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Before</h3>
            {srcDataUrl ? (
              <>
                <img
                  id="srcImageElem"
                  ref={srcImageRef}
                  src={srcDataUrl}
                  alt="source"
                  className="w-full h-auto rounded-lg shadow-md border border-gray-300 object-contain"
                  onLoad={() => { /* ensure canvas updated when needed */ }}
                />
                <canvas ref={hiddenSrcCanvasRef} className="hidden" />
              </>
            ) : <div className="p-10 text-center text-gray-400">No image selected</div>}
          </div>

          <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50 flex flex-col items-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">After</h3>
            <canvas ref={resultCanvasRef} className="w-full h-auto rounded-lg shadow-md border border-gray-300 object-contain" />
            {!processedDataUrl && <div className="p-10 text-center text-gray-400">No result yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}