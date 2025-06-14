import React, { useState, useRef, useEffect } from 'react';
import './WindowFrame.css';

const WindowFrame = ({
    children,
    title,
    onMinimize,
    onMaximize,
    onClose,
    onDrag,
    onResize,
    isMinimized,
    isMaximized,
    minWidth = 300,
    minHeight = 200
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const windowRef = useRef(null);

    const handleMouseDown = (e) => {
        if (e.target.className.includes('window-title-bar')) {
            setIsDragging(true);
            const rect = windowRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    const handleResizeStart = (e) => {
        if (isMaximized) return;
        
        setIsResizing(true);
        const rect = windowRef.current.getBoundingClientRect();
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height
        });
    };

    const handleMouseMove = (e) => {
        if (isDragging && !isMaximized) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            onDrag({ x: newX, y: newY });
        }

        if (isResizing && !isMaximized) {
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;
            const newWidth = Math.max(resizeStart.width + deltaX, minWidth);
            const newHeight = Math.max(resizeStart.height + deltaY, minHeight);
            onResize({ width: newWidth, height: newHeight });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing]);

    return (
        <div
            ref={windowRef}
            className={`window-frame ${isMaximized ? 'maximized' : ''}`}
            onMouseDown={handleMouseDown}
        >
            <div className="window-title-bar">
                <div className="window-title">{title}</div>
                <div className="window-controls">
                    <button className="window-control minimize" onClick={onMinimize}>
                        <i className="fas fa-minus"></i>
                    </button>
                    <button className="window-control maximize" onClick={onMaximize}>
                        <i className={`fas fa-${isMaximized ? 'compress' : 'expand'}`}></i>
                    </button>
                    <button className="window-control close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div className="window-content">
                {children}
            </div>
            {!isMaximized && (
                <div className="window-resize-handle" onMouseDown={handleResizeStart} />
            )}
        </div>
    );
};

export default WindowFrame; 