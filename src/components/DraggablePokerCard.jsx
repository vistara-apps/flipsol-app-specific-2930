import React, { useState, useRef } from 'react';
import PokerBetCard from './PokerBetCard';

const DraggablePokerCard = ({ side }) => {
  // Calculate initial positions based on side and screen size
  const getInitialPosition = () => {
    const containerWidth = window.innerWidth; 
    const containerHeight = window.innerHeight * 0.6; // 60vh poker table
    const cardWidth = 220;
    const cardHeight = 240;
    
    if (side === 0) {
      // Heads - Left side of the oval table
      return { 
        x: Math.max(20, containerWidth * 0.15), 
        y: Math.max(100, containerHeight * 0.3) 
      };
    } else {
      // Tails - Right side of the oval table
      return { 
        x: Math.max(containerWidth * 0.65, containerWidth - cardWidth - 20), 
        y: Math.max(100, containerHeight * 0.3) 
      };
    }
  };

  const [position, setPosition] = useState(getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  // Update position on window resize
  React.useEffect(() => {
    const handleResize = () => {
      if (!isDragging) {
        setPosition(getInitialPosition());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [side, isDragging]);

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) {
      // Don't start drag if clicking on interactive elements
      return;
    }

    setIsDragging(true);
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const container = cardRef.current.closest('.poker-table-container');
    const containerRect = container.getBoundingClientRect();
    
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    // Constrain to poker table bounds
    const cardWidth = 220;
    const cardHeight = 240;
    const maxX = containerRect.width - cardWidth;
    const maxY = containerRect.height - cardHeight;
    
    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add touch support for mobile
  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) {
      return;
    }

    setIsDragging(true);
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const container = cardRef.current.closest('.poker-table-container');
    const containerRect = container.getBoundingClientRect();
    
    const newX = touch.clientX - containerRect.left - dragOffset.x;
    const newY = touch.clientY - containerRect.top - dragOffset.y;
    
    const cardWidth = 220;
    const cardHeight = 240;
    const maxX = containerRect.width - cardWidth;
    const maxY = containerRect.height - cardHeight;
    
    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY))
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add global event listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={cardRef}
      className={`draggable-poker-card ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : 10,
        transition: isDragging ? 'none' : 'all 0.3s ease',
        transform: isDragging ? 'rotate(3deg) scale(1.05)' : 'rotate(0deg) scale(1)',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <PokerBetCard side={side} />
    </div>
  );
};

export default DraggablePokerCard;