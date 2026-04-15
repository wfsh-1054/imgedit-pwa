import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, RotateCw, Crop as CropIcon, Type, Download, Settings, RefreshCw, Sun, Moon, Globe } from 'lucide-react';
import { translations, Language } from '../lib/translations';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function ImageEditor() {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Crop State
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  
  // Rotate State
  const [rotation, setRotation] = useState(0);
  
  // Watermark State
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkColor, setWatermarkColor] = useState('#ffffff');
  const [watermarkFont, setWatermarkFont] = useState('sans-serif');
  const [watermarkSize, setWatermarkSize] = useState(5);
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  
  // Export State
  const [compressionQuality, setCompressionQuality] = useState(0.8);
  const [maxWidth, setMaxWidth] = useState(1920);

  const [activeTab, setActiveTab] = useState<'crop' | 'rotate' | 'watermark' | 'compress'>('crop');
  
  // Preview State
  const [previewSize, setPreviewSize] = useState<number | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState<{width: number, height: number} | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Language State
  const [langPref, setLangPref] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language;
      if (saved) return saved;
    }
    return 'system';
  });

  const [currentLang, setCurrentLang] = useState<'en' | 'zh'>('en');

  useEffect(() => {
    if (langPref === 'system') {
      const browserLang = navigator.language;
      setCurrentLang(browserLang.toLowerCase().startsWith('zh') ? 'zh' : 'en');
    } else {
      setCurrentLang(langPref);
    }
    localStorage.setItem('language', langPref);
  }, [langPref]);

  const t = translations[currentLang];

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const updateCanvas = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = imgRef.current;
    
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;

    if (completedCrop?.width && completedCrop?.height) {
      if (completedCrop.unit === '%') {
        sourceX = (completedCrop.x / 100) * image.naturalWidth;
        sourceY = (completedCrop.y / 100) * image.naturalHeight;
        sourceWidth = (completedCrop.width / 100) * image.naturalWidth;
        sourceHeight = (completedCrop.height / 100) * image.naturalHeight;
      } else {
        const scaleX = image.naturalWidth / (image.width || image.naturalWidth);
        const scaleY = image.naturalHeight / (image.height || image.naturalHeight);
        sourceX = completedCrop.x * scaleX;
        sourceY = completedCrop.y * scaleY;
        sourceWidth = completedCrop.width * scaleX;
        sourceHeight = completedCrop.height * scaleY;
      }
    }

    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    if (targetWidth > maxWidth) {
      const ratio = maxWidth / targetWidth;
      targetWidth = maxWidth;
      targetHeight = targetHeight * ratio;
    }

    const radians = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    
    canvas.width = targetWidth * cos + targetHeight * sin;
    canvas.height = targetWidth * sin + targetHeight * cos;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight
    );

    if (watermarkText) {
      ctx.rotate(-radians);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      
      const fontSize = Math.max(12, canvas.width * (watermarkSize / 100));
      ctx.font = `bold ${fontSize}px ${watermarkFont}`;
      ctx.fillStyle = watermarkColor;
      
      const isTop = watermarkPosition.includes('top');
      const isBottom = watermarkPosition.includes('bottom');
      const isLeft = watermarkPosition.includes('left');
      const isRight = watermarkPosition.includes('right');

      ctx.textAlign = isRight ? 'right' : isLeft ? 'left' : 'center';
      ctx.textBaseline = isBottom ? 'bottom' : isTop ? 'top' : 'middle';
      
      const padding = canvas.width * 0.02;
      let x = isRight ? canvas.width - padding : isLeft ? padding : canvas.width / 2;
      let y = isBottom ? canvas.height - padding : isTop ? padding : canvas.height / 2;
      
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = Math.max(2, fontSize * 0.15);
      ctx.shadowOffsetX = Math.max(1, fontSize * 0.08);
      ctx.shadowOffsetY = Math.max(1, fontSize * 0.08);
      
      ctx.fillText(watermarkText, Math.round(x), Math.round(y));
    }
  };

  useEffect(() => {
    if (!imgSrc) return;
    const timer = setTimeout(() => {
      updateCanvas();
      const canvas = previewCanvasRef.current;
      if (canvas) {
        setPreviewDimensions({ width: canvas.width, height: canvas.height });
        canvas.toBlob((blob) => {
          if (blob) setPreviewSize(blob.size);
        }, 'image/jpeg', compressionQuality);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [imgSrc, completedCrop, rotation, watermarkText, watermarkColor, watermarkFont, watermarkSize, watermarkPosition, compressionQuality, maxWidth]);

  const handleDownload = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited-image-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      'image/jpeg',
      compressionQuality
    );
  };

  const handleRotationSliderChange = (val: number) => {
    const rem = val % 90;
    let snapped = val;
    if (Math.abs(rem) <= 5) snapped = val - rem;
    else if (Math.abs(rem) >= 85) snapped = val + (90 * Math.sign(rem)) - rem;
    setRotation(snapped);
  };

  const handleAspectChange = (aspect: number | undefined) => {
    setCropAspect(aspect);
    if (aspect && imgRef.current) {
      const { width, height } = imgRef.current;
      const newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspect,
          width,
          height
        ),
        width,
        height
      );
      setCrop(newCrop);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#111214] text-slate-900 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-200">
      {/* Header */}
      <header className="h-[56px] bg-white dark:bg-[#1e2023] border-b border-slate-200 dark:border-[#2d3139] px-6 flex items-center justify-between z-10 shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
            <CropIcon className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-[16px] font-semibold tracking-[0.5px] text-slate-900 dark:text-slate-200">{t.appTitle}</h1>
          <span className="text-[11px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">{t.offlineReady}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 dark:bg-[#141619] rounded-md px-2 py-1.5 border border-slate-200 dark:border-[#2d3139]">
            <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-1.5" />
            <select
              value={langPref}
              onChange={(e) => setLangPref(e.target.value as Language)}
              className="bg-transparent text-slate-700 dark:text-slate-200 text-[13px] outline-none cursor-pointer"
            >
              <option value="system" className="bg-white dark:bg-[#1e2023]">{t.systemDefault}</option>
              <option value="en" className="bg-white dark:bg-[#1e2023]">English</option>
              <option value="zh" className="bg-white dark:bg-[#1e2023]">繁體中文</option>
            </select>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#2d3139] text-slate-500 dark:text-slate-400 transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {imgSrc && (
            <button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-2.5 rounded-md font-semibold text-[14px] transition-colors border-none cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{t.exportSave}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {!imgSrc ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-slate-100/50 dark:bg-[#0a0a0b] transition-colors duration-200">
            <label className="flex flex-col items-center justify-center w-full max-w-2xl h-96 border border-slate-300 dark:border-[#2d3139] rounded-md bg-white dark:bg-[#1e2023] hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group">
              <div className="bg-slate-50 dark:bg-[#141619] p-4 rounded-md mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-200 mb-2">{t.uploadTitle}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.uploadDesc}</p>
              <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
            </label>
          </div>
        ) : (
          <>
            {/* Workspace */}
            <div className="flex-1 bg-slate-100/50 dark:bg-[#0a0a0b] overflow-auto flex items-center justify-center p-10 relative transition-colors duration-200">
              
              {/* Crop View */}
              <div 
                className={`relative border border-slate-200 dark:border-[#2d3139] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out ${activeTab === 'crop' ? 'block' : 'hidden'}`}
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <ReactCrop
                  crop={crop}
                  aspect={cropAspect}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                  className="max-w-full max-h-[70vh]"
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    className="max-w-full max-h-[70vh] object-contain block rounded-sm"
                  />
                </ReactCrop>
              </div>

              {/* Live Canvas Preview (for Rotate, Watermark, Compress) */}
              <canvas
                ref={previewCanvasRef}
                className={`max-w-full max-h-[70vh] object-contain shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm ${activeTab !== 'crop' ? 'block' : 'hidden'}`}
              />

            </div>

            {/* Sidebar Tools */}
            <aside className="w-[320px] bg-white dark:bg-[#1e2023] border-l border-slate-200 dark:border-[#2d3139] flex flex-col z-10 shrink-0 transition-colors duration-200">
              <div className="flex border-b border-slate-200 dark:border-[#2d3139]">
                <button 
                  onClick={() => setActiveTab('crop')}
                  className={`flex-1 py-4 flex flex-col items-center gap-1 text-[12px] font-medium transition-colors ${activeTab === 'crop' ? 'text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <CropIcon className="w-4 h-4" /> {t.tabCrop}
                </button>
                <button 
                  onClick={() => setActiveTab('rotate')}
                  className={`flex-1 py-4 flex flex-col items-center gap-1 text-[12px] font-medium transition-colors ${activeTab === 'rotate' ? 'text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <RotateCw className="w-4 h-4" /> {t.tabRotate}
                </button>
                <button 
                  onClick={() => setActiveTab('watermark')}
                  className={`flex-1 py-4 flex flex-col items-center gap-1 text-[12px] font-medium transition-colors ${activeTab === 'watermark' ? 'text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <Type className="w-4 h-4" /> {t.tabMark}
                </button>
                <button 
                  onClick={() => setActiveTab('compress')}
                  className={`flex-1 py-4 flex flex-col items-center gap-1 text-[12px] font-medium transition-colors ${activeTab === 'compress' ? 'text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <Settings className="w-4 h-4" /> {t.tabExport}
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {activeTab === 'crop' && (
                  <div className="p-5 border-b border-slate-200 dark:border-[#2d3139]">
                    <div className="text-[11px] uppercase tracking-[1px] text-slate-500 dark:text-slate-400 mb-4 flex justify-between">
                      <span>{t.aspectRatio}</span>
                    </div>
                    <div className="mb-6">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {label: t.custom, val: undefined}, 
                          {label: '1:1', val: 1}, 
                          {label: '4:3', val: 4/3}, 
                          {label: '3:4', val: 3/4}, 
                          {label: '16:9', val: 16/9}, 
                          {label: '9:16', val: 9/16}
                        ].map(ratio => (
                          <button 
                            key={ratio.label}
                            onClick={() => handleAspectChange(ratio.val)}
                            className={`p-2 rounded-md text-[12px] cursor-pointer text-center transition-colors border ${cropAspect === ratio.val ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-500' : 'bg-slate-50 dark:bg-[#141619] border-slate-200 dark:border-[#2d3139] text-slate-700 dark:text-slate-200 hover:border-blue-500'}`}
                          >
                            {ratio.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-[11px] uppercase tracking-[1px] text-slate-500 dark:text-slate-400 mb-4 flex justify-between">
                      <span>{t.actions}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setCrop(undefined)} className="bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] text-slate-700 dark:text-slate-200 p-2 rounded-md text-[12px] cursor-pointer text-center hover:border-blue-500 transition-colors">{t.clearCrop}</button>
                      <button onClick={() => setCrop({ unit: '%', width: 50, height: 50, x: 25, y: 25 })} className="bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] text-slate-700 dark:text-slate-200 p-2 rounded-md text-[12px] cursor-pointer text-center hover:border-blue-500 transition-colors">{t.center50}</button>
                    </div>
                  </div>
                )}

                {activeTab === 'rotate' && (
                  <div className="p-5 border-b border-slate-200 dark:border-[#2d3139]">
                    <div className="text-[11px] uppercase tracking-[1px] text-slate-500 dark:text-slate-400 mb-4 flex justify-between">
                      <span>{t.rotation}</span>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center gap-4 mb-4">
                        <input 
                          type="range" 
                          min="-180" 
                          max="180" 
                          value={rotation} 
                          onChange={(e) => handleRotationSliderChange(Number(e.target.value))}
                          className="flex-1 h-1 bg-slate-200 dark:bg-[#2d3139] rounded-sm appearance-none my-2.5 accent-blue-600 dark:accent-blue-500"
                        />
                        <div className="flex items-center bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] rounded-md focus-within:border-blue-500 overflow-hidden transition-colors">
                          <input 
                            type="number" 
                            value={rotation}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="w-14 bg-transparent p-1.5 text-slate-900 dark:text-white text-[12px] text-right outline-none"
                          />
                          <span className="text-[12px] text-slate-500 dark:text-slate-400 pr-2">°</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setRotation(r => r - 90)} className="bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] text-slate-700 dark:text-slate-200 p-2 rounded-md text-[12px] cursor-pointer flex justify-center items-center hover:border-blue-500 transition-colors"><RefreshCw className="w-4 h-4 -scale-x-100" /></button>
                        <button onClick={() => setRotation(0)} className="bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] text-slate-700 dark:text-slate-200 p-2 rounded-md text-[12px] cursor-pointer text-center hover:border-blue-500 transition-colors">{t.reset}</button>
                        <button onClick={() => setRotation(r => r + 90)} className="bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] text-slate-700 dark:text-slate-200 p-2 rounded-md text-[12px] cursor-pointer flex justify-center items-center hover:border-blue-500 transition-colors"><RefreshCw className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'watermark' && (
                  <div className="p-5 border-b border-slate-200 dark:border-[#2d3139]">
                    <div className="text-[11px] uppercase tracking-[1px] text-slate-500 dark:text-slate-400 mb-4 flex justify-between">
                      <span>{t.watermarkSettings}</span>
                    </div>
                    <div className="mb-4">
                      <label className="block text-[13px] mb-2 text-slate-600 dark:text-slate-400">{t.textContent}</label>
                      <input 
                        type="text" 
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder={t.watermarkPlaceholder}
                        className="w-full bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] rounded-md p-2.5 text-slate-900 dark:text-white text-[13px] outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-[13px] mb-2 text-slate-600 dark:text-slate-400">{t.fontFamily}</label>
                      <select 
                        value={watermarkFont} 
                        onChange={(e) => setWatermarkFont(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] rounded-md p-2.5 text-slate-900 dark:text-white text-[13px] outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="sans-serif">Sans Serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                        <option value="Impact">Impact</option>
                        <option value="Comic Sans MS">Comic Sans</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-[13px] mb-2 text-slate-600 dark:text-slate-400">{t.size} ({watermarkSize}%)</label>
                      <input 
                        type="range" min="1" max="20" value={watermarkSize} 
                        onChange={(e) => setWatermarkSize(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-[#2d3139] rounded-sm appearance-none my-2.5 accent-blue-600 dark:accent-blue-500"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-[13px] mb-2 text-slate-600 dark:text-slate-400">{t.position}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {id: 'top-left', label: 'TL'}, {id: 'top-center', label: 'TC'}, {id: 'top-right', label: 'TR'},
                          {id: 'center-left', label: 'CL'}, {id: 'center', label: 'C'}, {id: 'center-right', label: 'CR'},
                          {id: 'bottom-left', label: 'BL'}, {id: 'bottom-center', label: 'BC'}, {id: 'bottom-right', label: 'BR'}
                        ].map(pos => (
                          <button 
                            key={pos.id}
                            onClick={() => setWatermarkPosition(pos.id)}
                            className={`p-2 rounded-md text-[11px] font-mono cursor-pointer text-center transition-colors border ${watermarkPosition === pos.id ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-500' : 'bg-slate-50 dark:bg-[#141619] border-slate-200 dark:border-[#2d3139] text-slate-700 dark:text-slate-200 hover:border-blue-500'}`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-[13px] mb-2 text-slate-600 dark:text-slate-400">{t.color}</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                        <span className="text-[13px] font-mono text-slate-900 dark:text-slate-200 uppercase">{watermarkColor}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'compress' && (
                  <div className="p-5 border-b border-slate-200 dark:border-[#2d3139]">
                    {/* Preview Info */}
                    {previewDimensions && previewSize && (
                      <div className="mb-6 bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] rounded-md p-4">
                        <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-[1px]">{t.outputPreview}</h4>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[12px] text-slate-500 dark:text-slate-400">{t.dimensions}</span>
                          <span className="text-[13px] text-slate-900 dark:text-slate-200 font-mono">{Math.round(previewDimensions.width)} × {Math.round(previewDimensions.height)} px</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-slate-500 dark:text-slate-400">{t.estFileSize}</span>
                          <span className="text-[13px] text-emerald-600 dark:text-emerald-400 font-mono">{formatBytes(previewSize)}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] uppercase tracking-[1px] text-slate-500 dark:text-slate-400 mb-4 flex justify-between">
                      <span>{t.exportSettings}</span>
                    </div>
                    <div className="mb-4">
                      <label className="block text-[13px] mb-2 text-slate-600 dark:text-slate-400">{t.compressionQuality} ({Math.round(compressionQuality * 100)}%)</label>
                      <div className="flex items-center gap-4 mb-2">
                        <input 
                          type="range" 
                          min="0.1" 
                          max="1" 
                          step="0.1"
                          value={compressionQuality} 
                          onChange={(e) => setCompressionQuality(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 dark:bg-[#2d3139] rounded-sm appearance-none my-2.5 accent-blue-600 dark:accent-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-[13px] mb-2 text-slate-600 dark:text-slate-400">{t.maxWidth}</label>
                      <input 
                        type="number" 
                        value={maxWidth}
                        onChange={(e) => setMaxWidth(Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-[#141619] border border-slate-200 dark:border-[#2d3139] rounded-md p-2.5 text-slate-900 dark:text-white text-[13px] outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-5 border-t border-slate-200 dark:border-[#2d3139] bg-white dark:bg-[#1e2023]">
                <button 
                  onClick={() => {
                    setImgSrc('');
                    setCrop(undefined);
                    setRotation(0);
                    setWatermarkText('');
                  }}
                  className="w-full py-2.5 text-[13px] text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  {t.startOver}
                </button>
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
