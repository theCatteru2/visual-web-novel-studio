import React, { useState, useRef, useEffect } from 'react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
}

export default function ImageCropModal({ isOpen, imageUrl, onClose, onSave }: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => {
        imgRef.current = img;
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
      };
    }
  }, [imageUrl]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStartPos.current.x);
    setOffsetY(e.clientY - dragStartPos.current.y);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tamaño de salida estándar para sprites
    canvas.width = 400;
    canvas.height = 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calcular proporciones
    const renderWidth = canvas.width * zoom;
    const renderHeight = (img.height / img.width) * renderWidth;

    const posX = (canvas.width - renderWidth) / 2 + offsetX;
    const posY = (canvas.height - renderHeight) / 2 + offsetY;

    ctx.drawImage(img, posX, posY, renderWidth, renderHeight);

    const croppedUrl = canvas.toDataURL('image/png');
    onSave(croppedUrl);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 5, 10, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#13131c',
        border: '1.5px solid #38bdf8',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 460,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 25px 50px rgba(0,0,0,0.9)'
      }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>
            ✂️ Ajustar y Centrar Sprite
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          Arrastra la imagen para centrarla y usa la barra inferior para recortar o hacer zoom.
        </div>

        {/* Visor de Recorte Interactivo (Marco 2:3) */}
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'relative',
            width: 240,
            height: 360,
            borderRadius: 12,
            border: '2px dashed #38bdf8',
            overflow: 'hidden',
            background: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          {/* Guías de Centro (Punto de anclaje) */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(56, 189, 248, 0.4)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '15%', height: 1, background: 'rgba(56, 189, 248, 0.7)', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', right: 4, top: -14, fontSize: 8, color: '#38bdf8' }}>Línea de Suelo</span>
          </div>

          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Preview" 
              draggable={false}
              style={{
                position: 'absolute',
                width: `${100 * zoom}%`,
                height: 'auto',
                left: `calc(50% + ${offsetX}px)`,
                top: `calc(50% + ${offsetY}px)`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none'
              }}
            />
          )}
        </div>

        {/* Control de Zoom / Escala */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
            <span>Zoom / Recorte:</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.05"
            value={zoom} 
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
          />
        </div>

        {/* Canvas invisible para procesar el recorte */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleExport}
            style={{ flex: 1, padding: '10px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
          >
            Aplicar Recorte
          </button>
        </div>
      </div>
    </div>
  );
}