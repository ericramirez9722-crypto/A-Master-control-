import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  Activity,
  Maximize2,
  Minimize2,
  X,
  Eye,
  Sliders,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCcw,
  Sparkles,
  BarChart2,
  Layers,
  Radio,
  Target
} from "lucide-react";

interface SpatialFrequencySpectrumProps {
  imageUrl: string | null;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export interface FrequencyBandData {
  frequency: number; // 0 to 0.5 cycles/pixel (Nyquist)
  wavelengthPx: number; // 1 / frequency (pixels per cycle)
  power: number; // Spectral power density (normalized 0..100)
  powerDb: number; // dB (-60 to 0)
  naturalBaseline: number; // Theoretical 1/f^2 natural scene baseline
  bandCategory: "Bajas (Estructura)" | "Medias (Textura)" | "Altas (Detalle)" | "Ultra-Altas (Nitidez)";
}

export interface FrequencyMetrics {
  sharpnessScore: number; // 0 to 100 Tenengrad / Laplacian variance score
  focusStatus: string; // e.g., "Súper Enfocado / Nitidez Crítica"
  focusColor: string; // Tailwind color class
  highFreqPowerRatio: number; // % energy in high frequencies
  midFreqPowerRatio: number;
  lowFreqPowerRatio: number;
  ultraHighPowerRatio: number;
  spatialEntropy: number; // Entropy of spatial details
  anisotropyRatio: number; // Horizontal vs Vertical focus ratio
  dominantWavelength: number; // Primary detail scale in pixels
}

export const SpatialFrequencySpectrum: React.FC<SpatialFrequencySpectrumProps> = ({
  imageUrl,
  onClose,
  isEmbedded = false
}) => {
  const chartRef = useRef<SVGSVGElement | null>(null);
  const map2DRef = useRef<HTMLCanvasElement | null>(null);

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useLogScale, setUseLogScale] = useState<boolean>(true);
  const [sampleRegion, setSampleRegion] = useState<"full" | "center" | "edges">("full");
  const [hoveredPoint, setHoveredPoint] = useState<FrequencyBandData | null>(null);
  const [activeTab, setActiveTab] = useState<"spectrum" | "2dmap" | "bands">("spectrum");

  const [spectrumData, setSpectrumData] = useState<FrequencyBandData[]>([]);
  const [grid2D, setGrid2D] = useState<number[][]>([]); // 32x32 2D frequency matrix
  const [metrics, setMetrics] = useState<FrequencyMetrics | null>(null);

  // Analyze image spatial frequencies when imageUrl or sampleRegion changes
  useEffect(() => {
    if (!imageUrl) {
      setSpectrumData([]);
      setGrid2D([]);
      setMetrics(null);
      return;
    }

    let isSubscribed = true;
    setAnalyzing(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      if (!isSubscribed) return;

      try {
        const size = 128; // Standard sampling resolution for fast computation
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          setError("No se pudo obtener el contexto 2D para análisis.");
          setAnalyzing(false);
          return;
        }

        // Draw image onto analysis canvas according to sample region
        if (sampleRegion === "center") {
          const sw = img.width * 0.5;
          const sh = img.height * 0.5;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        } else {
          ctx.drawImage(img, 0, 0, size, size);
        }

        const imgData = ctx.getImageData(0, 0, size, size);
        const pixels = imgData.data;

        // 1. Convert to Grayscale array (Luminance)
        const gray = new Float32Array(size * size);
        for (let i = 0; i < pixels.length; i += 4) {
          // Rec. 709 luminance
          gray[i / 4] = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
        }

        // 2. Compute 2D Spatial Gradients & Laplacian Variance for Sharpness/Focus
        let laplacianSum = 0;
        let laplacianSqSum = 0;
        let count = 0;
        let horizGradSum = 0;
        let vertGradSum = 0;

        // 2D Spatial Frequency Map (32x32 bins)
        const gridSize = 32;
        const grid2DMatrix: number[][] = Array.from({ length: gridSize }, () =>
          new Array(gridSize).fill(0)
        );

        // Compute spatial differences across grid
        for (let y = 1; y < size - 1; y++) {
          for (let x = 1; x < size - 1; x++) {
            const idx = y * size + x;
            const val = gray[idx];

            // Discrete Laplacian (measure of second spatial derivative = sharpness)
            const lap =
              gray[idx - 1] +
              gray[idx + 1] +
              gray[idx - size] +
              gray[idx + size] -
              4 * val;

            laplacianSum += lap;
            laplacianSqSum += lap * lap;

            // 1st order gradients
            const dx = Math.abs(gray[idx + 1] - gray[idx - 1]);
            const dy = Math.abs(gray[idx + size] - gray[idx - size]);
            horizGradSum += dx;
            vertGradSum += dy;

            count++;
          }
        }

        // Variance of Laplacian (Tenengrad focus measure)
        const meanLap = laplacianSum / Math.max(1, count);
        const lapVariance = laplacianSqSum / Math.max(1, count) - meanLap * meanLap;

        // Normalize sharpness score (0 to 100)
        const rawSharpness = Math.sqrt(Math.max(0, lapVariance));
        const sharpnessScore = Math.min(100, Math.max(0, Math.round((rawSharpness / 35) * 100)));

        // 3. Compute 2D Discrete Cosine / Frequency Magnitude Spectrum
        // We calculate radial spatial frequency power distribution across N frequency bins
        const numBins = 50;
        const binPowers = new Float32Array(numBins);
        const binCounts = new Int32Array(numBins);

        // Approximate 2D frequency decomposition via 2D DCT / Fourier radial sampling
        const step = 2; // Speed optimization
        const halfG = gridSize / 2;

        for (let u = 0; u < gridSize; u++) {
          for (let v = 0; v < gridSize; v++) {
            // Spatial frequency coordinates centered at (halfG, halfG)
            const fu = (u - halfG) / halfG; // -1.0 to +1.0
            const fv = (v - halfG) / halfG;
            const radialFreq = Math.sqrt(fu * fu + fv * fv) / Math.SQRT2; // 0 to 1 (Nyquist)

            if (radialFreq > 1.0) continue;

            // Compute spatial power at (u,v) frequency
            let real = 0;
            let imag = 0;
            const freqX = (u - halfG) * (Math.PI / size);
            const freqY = (v - halfG) * (Math.PI / size);

            for (let y = 0; y < size; y += step) {
              for (let x = 0; x < size; x += step) {
                const val = gray[y * size + x];
                const angle = freqX * x + freqY * y;
                real += val * Math.cos(angle);
                imag -= val * Math.sin(angle);
              }
            }

            const magnitude = Math.sqrt(real * real + imag * imag) / (size * size);
            const power = magnitude * magnitude;

            grid2DMatrix[v][u] = power;

            // Map radial frequency to 1D radial spectrum bin
            const binIdx = Math.min(
              numBins - 1,
              Math.floor(radialFreq * (numBins - 1))
            );
            binPowers[binIdx] += power;
            binCounts[binIdx]++;
          }
        }

        // Normalize 2D grid matrix
        let maxGridVal = 0;
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (grid2DMatrix[r][c] > maxGridVal) maxGridVal = grid2DMatrix[r][c];
          }
        }
        if (maxGridVal > 0) {
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              grid2DMatrix[r][c] = Math.sqrt(grid2DMatrix[r][c] / maxGridVal);
            }
          }
        }

        // 4. Construct 1D Spatial Frequency Spectrum Data
        let maxPower = 0;
        for (let i = 0; i < numBins; i++) {
          if (binCounts[i] > 0) binPowers[i] /= binCounts[i];
          if (i > 0 && binPowers[i] > maxPower) maxPower = binPowers[i];
        }

        if (maxPower === 0) maxPower = 1;

        const bands: FrequencyBandData[] = [];
        let lowEnergy = 0;
        let midEnergy = 0;
        let highEnergy = 0;
        let ultraEnergy = 0;
        let totalEnergy = 0;

        for (let i = 0; i < numBins; i++) {
          // frequency in cycles per pixel (0 to 0.5 Nyquist)
          const freqNyquist = (i / (numBins - 1)) * 0.5;
          const wavelengthPx = freqNyquist > 0 ? 1 / (freqNyquist * 2) : 999;
          
          // Normalized power 0..100
          const normPower = Math.min(100, (binPowers[i] / maxPower) * 100);
          const powerDb = Math.max(-60, 10 * Math.log10((binPowers[i] + 1e-8) / maxPower));

          // Natural scene 1/f^2 reference baseline curve
          const naturalBaseline =
            freqNyquist === 0 ? 100 : Math.min(100, (1 / Math.pow(1 + freqNyquist * 12, 1.8)) * 100);

          let bandCategory: FrequencyBandData["bandCategory"] = "Bajas (Estructura)";
          if (freqNyquist > 0.35) {
            bandCategory = "Ultra-Altas (Nitidez)";
            ultraEnergy += binPowers[i];
          } else if (freqNyquist > 0.2) {
            bandCategory = "Altas (Detalle)";
            highEnergy += binPowers[i];
          } else if (freqNyquist > 0.08) {
            bandCategory = "Medias (Textura)";
            midEnergy += binPowers[i];
          } else {
            bandCategory = "Bajas (Estructura)";
            lowEnergy += binPowers[i];
          }

          totalEnergy += binPowers[i];

          bands.push({
            frequency: parseFloat(freqNyquist.toFixed(3)),
            wavelengthPx: parseFloat(wavelengthPx.toFixed(1)),
            power: parseFloat(normPower.toFixed(2)),
            powerDb: parseFloat(powerDb.toFixed(1)),
            naturalBaseline: parseFloat(naturalBaseline.toFixed(2)),
            bandCategory
          });
        }

        // Percentage distributions
        const total = Math.max(1e-6, totalEnergy);
        const lowRatio = Math.round((lowEnergy / total) * 100);
        const midRatio = Math.round((midEnergy / total) * 100);
        const highRatio = Math.round((highEnergy / total) * 100);
        const ultraRatio = Math.round((ultraEnergy / total) * 100);

        // Anisotropy (Horizontal vs Vertical edge dominance)
        const anisotropy = vertGradSum > 0 ? horizGradSum / vertGradSum : 1.0;

        // Focus Status assessment
        let focusStatus = "Equilibrado / Normal";
        let focusColor = "text-amber-400";

        if (sharpnessScore >= 75) {
          focusStatus = "Súper Enfocado / Nitidez Crítica (Razor-Sharp)";
          focusColor = "text-emerald-400";
        } else if (sharpnessScore >= 50) {
          focusStatus = "Enfoque Nítido / Alto Detalle";
          focusColor = "text-cyan-400";
        } else if (sharpnessScore >= 30) {
          focusStatus = "Enfoque Suave / Textura Media";
          focusColor = "text-amber-400";
        } else {
          focusStatus = "Desenfoque Elevado / Efecto Bokeh";
          focusColor = "text-red-400";
        }

        // Dominant detail wavelength
        let maxHighBin = 0;
        let maxHighVal = 0;
        for (let i = Math.floor(numBins * 0.2); i < numBins; i++) {
          if (binPowers[i] > maxHighVal) {
            maxHighVal = binPowers[i];
            maxHighBin = i;
          }
        }
        const dominantWavelength = bands[maxHighBin]?.wavelengthPx || 4;

        setSpectrumData(bands);
        setGrid2D(grid2DMatrix);
        setMetrics({
          sharpnessScore,
          focusStatus,
          focusColor,
          highFreqPowerRatio: highRatio,
          midFreqPowerRatio: midRatio,
          lowFreqPowerRatio: lowRatio,
          ultraHighPowerRatio: ultraRatio,
          spatialEntropy: parseFloat((Math.log2(totalEnergy + 1) * 2.5).toFixed(1)),
          anisotropyRatio: parseFloat(anisotropy.toFixed(2)),
          dominantWavelength
        });

        setAnalyzing(false);
      } catch (err: any) {
        console.error("Error analyzing spatial frequencies:", err);
        setError("Error procesando espectro de frecuencia: " + (err?.message || "desconocido"));
        setAnalyzing(false);
      }
    };

    img.onerror = () => {
      if (!isSubscribed) return;
      setError("No se pudo cargar la imagen para análisis de frecuencia.");
      setAnalyzing(false);
    };

    return () => {
      isSubscribed = false;
    };
  }, [imageUrl, sampleRegion]);

  // Render D3.js Area & Line Spectrum Chart
  useEffect(() => {
    if (!chartRef.current || spectrumData.length === 0) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove(); // Clear previous drawing

    const containerWidth = chartRef.current.clientWidth || 550;
    const containerHeight = 260;
    const margin = { top: 25, right: 25, bottom: 45, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale: Frequency (0 to 0.5 cycles/px)
    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(spectrumData, (d) => d.frequency) || 0.5])
      .range([0, width]);

    // Y Scale: Power (%) or dB
    const yScale = useLogScale
      ? d3.scaleLinear().domain([-60, 5]).range([height, 0])
      : d3.scaleLinear().domain([0, 105]).range([height, 0]);

    // Gradients definitions
    const defs = svg.append("defs");

    // Area Gradient under power curve
    const areaGradient = defs
      .append("linearGradient")
      .attr("id", "freq-area-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6").attr("stop-opacity", "0.4");
    areaGradient.append("stop").attr("offset", "35%").attr("stop-color", "#06b6d4").attr("stop-opacity", "0.3");
    areaGradient.append("stop").attr("offset", "70%").attr("stop-color", "#f59e0b").attr("stop-opacity", "0.35");
    areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#10b981").attr("stop-opacity", "0.45");

    // Gridlines
    const xGrid = d3.axisBottom(xScale).ticks(8).tickSize(-height).tickFormat(() => "");
    const yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => "");

    g.append("g")
      .attr("class", "grid-lines")
      .attr("transform", `translate(0,${height})`)
      .call(xGrid)
      .selectAll("line")
      .attr("stroke", "rgba(255, 255, 255, 0.05)")
      .attr("stroke-dasharray", "2,2");

    g.append("g")
      .attr("class", "grid-lines")
      .call(yGrid)
      .selectAll("line")
      .attr("stroke", "rgba(255, 255, 255, 0.05)")
      .attr("stroke-dasharray", "2,2");

    // Natural 1/f^2 scene baseline reference curve
    const baselineLine = d3
      .line<FrequencyBandData>()
      .x((d) => xScale(d.frequency))
      .y((d) => yScale(useLogScale ? Math.max(-55, 10 * Math.log10(d.naturalBaseline / 100)) : d.naturalBaseline))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(spectrumData)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.25)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4")
      .attr("d", baselineLine);

    // Spectrum Area
    const areaGenerator = d3
      .area<FrequencyBandData>()
      .x((d) => xScale(d.frequency))
      .y0(height)
      .y1((d) => yScale(useLogScale ? d.powerDb : d.power))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(spectrumData)
      .attr("fill", "url(#freq-area-grad)")
      .attr("d", areaGenerator);

    // Spectrum Line
    const lineGenerator = d3
      .line<FrequencyBandData>()
      .x((d) => xScale(d.frequency))
      .y((d) => yScale(useLogScale ? d.powerDb : d.power))
      .curve(d3.curveMonotoneX);

    const path = g
      .append("path")
      .datum(spectrumData)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2.5)
      .attr("d", lineGenerator);

    // Animate line draw
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // Frequency Band Dividers
    const bandCutoffs = [
      { freq: 0.08, label: "Bajas", color: "rgba(59, 130, 246, 0.5)" },
      { freq: 0.2, label: "Medias", color: "rgba(6, 182, 212, 0.5)" },
      { freq: 0.35, label: "Altas", color: "rgba(245, 158, 11, 0.5)" }
    ];

    bandCutoffs.forEach((cutoff) => {
      const x = xScale(cutoff.freq);
      g.append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", cutoff.color)
        .attr("stroke-dasharray", "3,3")
        .attr("stroke-width", 1);

      g.append("text")
        .attr("x", x + 4)
        .attr("y", 12)
        .attr("fill", "rgba(255,255,255,0.4)")
        .attr("font-size", "8px")
        .attr("font-weight", "bold")
        .attr("font-family", "monospace")
        .text(cutoff.label);
    });

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => `${d} c/px`);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => (useLogScale ? `${d} dB` : `${d}%`));

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .attr("font-size", "9px")
      .attr("font-family", "monospace");

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .attr("font-size", "9px")
      .attr("font-family", "monospace");

    // Remove domain axis lines for ultra clean modern styling
    g.selectAll(".domain").attr("stroke", "rgba(255,255,255,0.1)");

    // Interactive Hover Tracking Line & Focus Circle
    const focusGroup = g.append("g").style("display", "none");

    focusGroup
      .append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#38bdf8")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "2,2");

    focusGroup
      .append("circle")
      .attr("r", 5)
      .attr("fill", "#38bdf8")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

    // Overlay rect for mouse interaction
    g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove touchmove", (event) => {
        const [mouseX] = d3.pointer(event);
        const freqVal = xScale.invert(mouseX);

        // Find nearest data point
        const bisect = d3.bisector<FrequencyBandData, number>((d) => d.frequency).left;
        const index = Math.min(
          spectrumData.length - 1,
          Math.max(0, bisect(spectrumData, freqVal))
        );
        const dataPoint = spectrumData[index];

        if (dataPoint) {
          setHoveredPoint(dataPoint);
          focusGroup.style("display", null);
          const px = xScale(dataPoint.frequency);
          const py = yScale(useLogScale ? dataPoint.powerDb : dataPoint.power);
          focusGroup.select(".hover-line").attr("x1", px).attr("x2", px);
          focusGroup.select("circle").attr("cx", px).attr("cy", py);
        }
      })
      .on("mouseleave touchend", () => {
        setHoveredPoint(null);
        focusGroup.style("display", "none");
      });
  }, [spectrumData, useLogScale]);

  // Render 2D Spatial Frequency Map on Canvas
  useEffect(() => {
    if (!map2DRef.current || grid2D.length === 0) return;

    const canvas = map2DRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = grid2D.length;
    const cellSize = canvas.width / size;

    // Color Interpolator (D3 Turbo / Inferno palette)
    const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([0, 1]);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = grid2D[r][c];
        ctx.fillStyle = colorScale(val);
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }

    // Crosshair at DC center (zero frequency)
    const center = canvas.width / 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, canvas.height);
    ctx.moveTo(0, center);
    ctx.lineTo(canvas.width, center);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [grid2D, activeTab]);

  return (
    <div
      className={`${
        isEmbedded
          ? "w-full bg-zinc-950/80 rounded-3xl border border-white/10 p-5 backdrop-blur-2xl"
          : "fixed inset-0 z-[220] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto"
      }`}
    >
      <div
        className={`${
          isEmbedded
            ? "w-full"
            : "relative w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden"
        }`}
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <Activity className="text-amber-400 animate-pulse" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 font-mono">
                  ANÁLISIS ESPECTRAL 2D (D3.JS)
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono font-bold rounded-full">
                  TIEMPO REAL
                </span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Espectro de Frecuencias Espaciales & Diagnóstico de Enfoque
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Region Selector */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
              <button
                onClick={() => setSampleRegion("full")}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                  sampleRegion === "full"
                    ? "bg-amber-400 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Completa
              </button>
              <button
                onClick={() => setSampleRegion("center")}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                  sampleRegion === "center"
                    ? "bg-amber-400 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Centro (ROI)
              </button>
            </div>

            {onClose && !isEmbedded && (
              <button
                onClick={onClose}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-2xl transition-all"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {analyzing ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCcw size={32} className="text-amber-400 animate-spin" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
              Calculando transformada de frecuencias espaciales y nitidez...
            </span>
          </div>
        ) : error ? (
          <div className="py-12 px-6 my-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-400">
            <AlertTriangle size={24} className="shrink-0" />
            <p className="text-xs font-mono">{error}</p>
          </div>
        ) : !imageUrl ? (
          <div className="py-16 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
            Seleccione o genere una imagen para analizar su espectro de frecuencia.
          </div>
        ) : (
          <div className="mt-6 space-y-6 relative z-10">
            {/* Top Key Metrics Banner */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Sharpness Index */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                    <span>Índice de Nitidez</span>
                    <Zap size={12} className="text-amber-400" />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-white">
                      {metrics.sharpnessScore}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">/ 100</span>
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider ${metrics.focusColor}`}>
                    {metrics.focusStatus}
                  </span>
                </div>

                {/* High Frequency Power */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                    <span>Detalle Ultra-Alto</span>
                    <Sparkles size={12} className="text-cyan-400" />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-cyan-400">
                      {metrics.highFreqPowerRatio + metrics.ultraHighPowerRatio}%
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">energía</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400">
                    Texturas & Micro-bordes
                  </span>
                </div>

                {/* Dominant Wavelength */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                    <span>Escala Frecuencia</span>
                    <Target size={12} className="text-emerald-400" />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {metrics.dominantWavelength}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">px / ciclo</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400">
                    Longitud de onda dominante
                  </span>
                </div>

                {/* Anisotropy */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                    <span>Anisotropía Horiz/Vert</span>
                    <Radio size={12} className="text-indigo-400" />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-indigo-300">
                      {metrics.anisotropyRatio}x
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400">
                    {metrics.anisotropyRatio > 1.2
                      ? "Enfoque predominantemente vertical"
                      : metrics.anisotropyRatio < 0.8
                      ? "Enfoque predominantemente horizontal"
                      : "Enfoque isótropo omnidireccional"}
                  </span>
                </div>
              </div>
            )}

            {/* View Selector Tabs */}
            <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("spectrum")}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    activeTab === "spectrum"
                      ? "bg-amber-400 text-black shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BarChart2 size={14} /> Curva de Espectro D3
                </button>
                <button
                  onClick={() => setActiveTab("2dmap")}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    activeTab === "2dmap"
                      ? "bg-amber-400 text-black shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Radio size={14} /> Espectrograma 2D
                </button>
                <button
                  onClick={() => setActiveTab("bands")}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    activeTab === "bands"
                      ? "bg-amber-400 text-black shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Layers size={14} /> Distribución de Bandas
                </button>
              </div>

              {activeTab === "spectrum" && (
                <button
                  onClick={() => setUseLogScale(!useLogScale)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[9px] font-mono font-bold rounded-xl uppercase transition-all"
                >
                  Escala: {useLogScale ? "Logarítmica (dB)" : "Lineal (%)"}
                </button>
              )}
            </div>

            {/* TAB 1: D3 Spectrum Area Chart */}
            {activeTab === "spectrum" && (
              <div className="space-y-4">
                <div className="relative bg-black/60 border border-white/10 rounded-3xl p-4 overflow-hidden">
                  <svg ref={chartRef} className="w-full h-[260px]" />

                  {/* Hovered Point Info Tooltip HUD */}
                  {hoveredPoint && (
                    <div className="absolute top-6 right-6 bg-zinc-900/95 border border-amber-400/30 rounded-2xl p-3 shadow-2xl backdrop-blur-xl font-mono text-[10px] space-y-1 z-20 min-w-[200px]">
                      <div className="text-amber-400 font-black uppercase tracking-wider border-b border-white/10 pb-1">
                        {hoveredPoint.bandCategory}
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Frecuencia:</span>
                        <span className="font-bold text-white">
                          {hoveredPoint.frequency} cycles/px
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Detalle (~Long. Onda):</span>
                        <span className="font-bold text-cyan-400">
                          {hoveredPoint.wavelengthPx} px
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Densidad Potencia:</span>
                        <span className="font-bold text-emerald-400">
                          {hoveredPoint.power}% ({hoveredPoint.powerDb} dB)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 px-2">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-amber-400 rounded-full inline-block" />
                    Espectro de Frecuencia Real de la Imagen
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-white/30 border-t border-dashed border-white rounded-full inline-block" />
                    Línea Base Escenas Naturales (Ley 1/f²)
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: 2D Spatial Frequency Map */}
            {activeTab === "2dmap" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col items-center justify-center p-6 bg-black/60 border border-white/10 rounded-3xl gap-3">
                  <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest">
                    MAPA DE FRECUENCIAS 2D (Fx vs Fy)
                  </span>
                  <canvas
                    ref={map2DRef}
                    width={256}
                    height={256}
                    className="rounded-2xl border border-white/10 shadow-2xl bg-black"
                  />
                  <span className="text-[9px] font-mono text-zinc-500 text-center">
                    El centro representa frecuencia cero (DC). Las esquinas representan frecuencias espaciales altas (detalles y bordes finos).
                  </span>
                </div>

                <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-3xl">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Info size={14} className="text-amber-400" /> ¿Cómo interpretar el espectrograma 2D?
                  </h4>
                  <ul className="space-y-2 text-[11px] text-zinc-300 leading-relaxed font-sans">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <b>Simetría Radial:</b> Si los colores brillantes se distribuyen uniformemente alrededor del centro, la nitidez es uniforme en todas las direcciones.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <b>Extensión a las Esquinas:</b> Cuanto más se extienda el brillo hacia las esquinas, mayor es el nivel de nitidez, enfoque y micro-detalle en la imagen.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <b>Direccionalidad:</b> Líneas brillantes en un solo eje indican patrones dominantes o movimiento en esa dirección.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 3: Frequency Bands Breakdown */}
            {activeTab === "bands" && metrics && (
              <div className="space-y-4">
                <div className="p-6 bg-black/60 border border-white/10 rounded-3xl space-y-5">
                  {/* Bajas */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-blue-400 font-bold uppercase tracking-wider">
                        Bajas Frecuencias (Estructura / Iluminación Global)
                      </span>
                      <span className="text-white font-bold">{metrics.lowFreqPowerRatio}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                        style={{ width: `${metrics.lowFreqPowerRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Medias */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cyan-400 font-bold uppercase tracking-wider">
                        Medias Frecuencias (Formas / Texturas Primarias)
                      </span>
                      <span className="text-white font-bold">{metrics.midFreqPowerRatio}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-700"
                        style={{ width: `${metrics.midFreqPowerRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Altas */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-amber-400 font-bold uppercase tracking-wider">
                        Altas Frecuencias (Contornos & Bordes Definidos)
                      </span>
                      <span className="text-white font-bold">{metrics.highFreqPowerRatio}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${metrics.highFreqPowerRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Ultra-Altas */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-400 font-bold uppercase tracking-wider">
                        Ultra-Altas Frecuencias (Nitidez 4K & Granularidad Finísima)
                      </span>
                      <span className="text-white font-bold">{metrics.ultraHighPowerRatio}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${metrics.ultraHighPowerRatio}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
