"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, RotateCw, Type } from 'lucide-react';

interface Sticker {
  id: string;
  emoji: string;
  name?: string;
  x: number;
  y: number;
  rotation: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  style: {
    fontSize: number;
    color: string;
    fontWeight: string;
  };
}

interface ContentEditorProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  platform: string;
  onBack: () => void;
  onPost: () => void;
  onSave: () => void;
}

interface DraggableStickerProps {
  sticker: Sticker;
  onUpdate: (id: string, updates: Partial<Sticker>) => void;
  onRemove: (id: string) => void;
}

interface DraggableTextProps {
  textOverlay: TextOverlay;
  onUpdate: (id: string, updates: Partial<TextOverlay>) => void;
  onRemove: (id: string) => void;
}

const DraggableSticker: React.FC<DraggableStickerProps> = ({ sticker, onUpdate, onRemove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setStartPos({ x: touch.clientX - sticker.x, y: touch.clientY - sticker.y });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    onUpdate(sticker.id, {
      x: touch.clientX - startPos.x,
      y: touch.clientY - startPos.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    onUpdate(sticker.id, { rotation: sticker.rotation + 45 });
  };

  const handleDoubleClick = () => {
    onRemove(sticker.id);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: sticker.x,
        top: sticker.y,
        transform: `rotate(${sticker.rotation}deg)`,
        cursor: 'move',
        zIndex: 1000,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <img
        src={sticker.emoji}
        alt={sticker.name || 'sticker'}
        style={{
          width: '96px',
          height: '96px',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      <button
        onClick={handleRotate}
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        <RotateCw size={12} />
      </button>
    </div>
  );
};

const DraggableText: React.FC<DraggableTextProps> = ({ textOverlay, onUpdate, onRemove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setStartPos({ x: touch.clientX - textOverlay.x, y: touch.clientY - textOverlay.y });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    onUpdate(textOverlay.id, {
      x: touch.clientX - startPos.x,
      y: touch.clientY - startPos.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: textOverlay.x,
        top: textOverlay.y,
        cursor: 'move',
        zIndex: 1000,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          ...textOverlay.style,
          userSelect: 'none',
          pointerEvents: 'none',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        }}
      >
        {textOverlay.text}
      </div>
    </div>
  );
};

const ContentEditor: React.FC<ContentEditorProps> = ({
  mediaUrl,
  mediaType,
  platform,
  onBack,
  onPost,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'text'>('stickers');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [textStyle, setTextStyle] = useState({
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  });
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');

  const availableStickers = [
    // Old School Stickers
    { id: '1', imageUrl: '/stickers/Old-school-1.png', name: 'Old-school-1', category: 'old-school' },
    { id: '2', imageUrl: '/stickers/Old-school-2.png', name: 'Old-school-2', category: 'old-school' },
    { id: '3', imageUrl: '/stickers/Old-school-3.png', name: 'Old-school-3', category: 'old-school' },
    { id: '4', imageUrl: '/stickers/Old-school-4.png', name: 'Old-school-4', category: 'old-school' },
    { id: '5', imageUrl: '/stickers/Old-school-5.png', name: 'Old-school-5', category: 'old-school' },
    { id: '6', imageUrl: '/stickers/Old-school-6.png', name: 'Old-school-6', category: 'old-school' },
    { id: '7', imageUrl: '/stickers/Old-school-7.png', name: 'Old-school-7', category: 'old-school' },
    { id: '8', imageUrl: '/stickers/Old-school-8.png', name: 'Old-school-8', category: 'old-school' },
    { id: '9', imageUrl: '/stickers/Old-school-9.png', name: 'Old-school-9', category: 'old-school' },
    { id: '10', imageUrl: '/stickers/Old-school-10.png', name: 'Old-school-10', category: 'old-school' },
    { id: '11', imageUrl: '/stickers/Old-school-11.png', name: 'Old-school-11', category: 'old-school' },
    { id: '12', imageUrl: '/stickers/Old-school-12.png', name: 'Old-school-12', category: 'old-school' },
    { id: '13', imageUrl: '/stickers/Old-school-13.png', name: 'Old-school-13', category: 'old-school' },
    { id: '14', imageUrl: '/stickers/Old-school-14.png', name: 'Old-school-14', category: 'old-school' },
    { id: '15', imageUrl: '/stickers/Old-school-15.png', name: 'Old-school-15', category: 'old-school' },
    { id: '16', imageUrl: '/stickers/Old-school-16.png', name: 'Old-school-16', category: 'old-school' },
    { id: '17', imageUrl: '/stickers/Old-school-17.png', name: 'Old-school-17', category: 'old-school' },
    { id: '18', imageUrl: '/stickers/Old-school-18.png', name: 'Old-school-18', category: 'old-school' },
    { id: '19', imageUrl: '/stickers/Old-school-19.png', name: 'Old-school-19', category: 'old-school' },
    { id: '20', imageUrl: '/stickers/Old-school-20.png', name: 'Old-school-20', category: 'old-school' },
    { id: '21', imageUrl: '/stickers/Old-school-21.png', name: 'Old-school-21', category: 'old-school' },
    { id: '22', imageUrl: '/stickers/Old-school-22.png', name: 'Old-school-22', category: 'old-school' },
    { id: '23', imageUrl: '/stickers/Old-school-23.png', name: 'Old-school-23', category: 'old-school' },
    { id: '24', imageUrl: '/stickers/Old-school-24.png', name: 'Old-school-24', category: 'old-school' },
    { id: '25', imageUrl: '/stickers/Old-school-25.png', name: 'Old-school-25', category: 'old-school' },
    { id: '26', imageUrl: '/stickers/Old-school-26.png', name: 'Old-school-26', category: 'old-school' },
    { id: '27', imageUrl: '/stickers/Old-school-27.png', name: 'Old-school-27', category: 'old-school' },
    { id: '28', imageUrl: '/stickers/Old-school-28.png', name: 'Old-school-28', category: 'old-school' },
    { id: '29', imageUrl: '/stickers/Old-school-29.png', name: 'Old-school-29', category: 'old-school' },
    { id: '30', imageUrl: '/stickers/Old-school-30.png', name: 'Old-school-30', category: 'old-school' },
    { id: '31', imageUrl: '/stickers/Old-school-31.png', name: 'Old-school-31', category: 'old-school' },
    { id: '32', imageUrl: '/stickers/Old-school-32.png', name: 'Old-school-32', category: 'old-school' },
    { id: '33', imageUrl: '/stickers/Old-school-33.png', name: 'Old-school-33', category: 'old-school' },
    { id: '34', imageUrl: '/stickers/Old-school-34.png', name: 'Old-school-34', category: 'old-school' },
    { id: '35', imageUrl: '/stickers/Old-school-35.png', name: 'Old-school-35', category: 'old-school' },
    { id: '36', imageUrl: '/stickers/Old-school-36.png', name: 'Old-school-36', category: 'old-school' },
    { id: '37', imageUrl: '/stickers/Old-school-37.png', name: 'Old-school-37', category: 'old-school' },
    { id: '38', imageUrl: '/stickers/Old-school-38.png', name: 'Old-school-38', category: 'old-school' },
    { id: '39', imageUrl: '/stickers/Old-school-39.png', name: 'Old-school-39', category: 'old-school' },
    { id: '40', imageUrl: '/stickers/Old-school-40.png', name: 'Old-school-40', category: 'old-school' },
    { id: '41', imageUrl: '/stickers/Old-school-41.png', name: 'Old-school-41', category: 'old-school' },
    { id: '42', imageUrl: '/stickers/Old-school-42.png', name: 'Old-school-42', category: 'old-school' },
    { id: '43', imageUrl: '/stickers/Old-school-43.png', name: 'Old-school-43', category: 'old-school' },
    { id: '44', imageUrl: '/stickers/Old-school-44.png', name: 'Old-school-44', category: 'old-school' },
    { id: '45', imageUrl: '/stickers/Old-school-45.png', name: 'Old-school-45', category: 'old-school' },
    { id: '46', imageUrl: '/stickers/Old-school-46.png', name: 'Old-school-46', category: 'old-school' },
    { id: '47', imageUrl: '/stickers/Old-school-47.png', name: 'Old-school-47', category: 'old-school' },
    { id: '48', imageUrl: '/stickers/Old-school-48.png', name: 'Old-school-48', category: 'old-school' },
    { id: '49', imageUrl: '/stickers/Old-school-49.png', name: 'Old-school-49', category: 'old-school' },
    { id: '50', imageUrl: '/stickers/Old-school-50.png', name: 'Old-school-50', category: 'old-school' },
    { id: '51', imageUrl: '/stickers/Old-school-51.png', name: 'Old-school-51', category: 'old-school' },
    { id: '52', imageUrl: '/stickers/Old-school-52.png', name: 'Old-school-52', category: 'old-school' },
    { id: '53', imageUrl: '/stickers/Old-school-53.png', name: 'Old-school-53', category: 'old-school' },
    { id: '54', imageUrl: '/stickers/Old-school-54.png', name: 'Old-school-54', category: 'old-school' },
    { id: '55', imageUrl: '/stickers/Old-school-55.png', name: 'Old-school-55', category: 'old-school' },
    { id: '56', imageUrl: '/stickers/Old-school-56.png', name: 'Old-school-56', category: 'old-school' },
    { id: '57', imageUrl: '/stickers/Old-school-57.png', name: 'Old-school-57', category: 'old-school' },
    { id: '58', imageUrl: '/stickers/Old-school-58.png', name: 'Old-school-58', category: 'old-school' },
    { id: '59', imageUrl: '/stickers/Old-school-59.png', name: 'Old-school-59', category: 'old-school' },
    { id: '60', imageUrl: '/stickers/Old-school-60.png', name: 'Old-school-60', category: 'old-school' },
    { id: '61', imageUrl: '/stickers/Old-school-61.png', name: 'Old-school-61', category: 'old-school' },
    { id: '62', imageUrl: '/stickers/Old-school-62.png', name: 'Old-school-62', category: 'old-school' },
    { id: '63', imageUrl: '/stickers/Old-school-63.png', name: 'Old-school-63', category: 'old-school' },
    { id: '64', imageUrl: '/stickers/Old-school-64.png', name: 'Old-school-64', category: 'old-school' },
    { id: '65', imageUrl: '/stickers/Old-school-65.png', name: 'Old-school-65', category: 'old-school' },
    { id: '66', imageUrl: '/stickers/Old-school-66.png', name: 'Old-school-66', category: 'old-school' },
    { id: '67', imageUrl: '/stickers/Old-school-67.png', name: 'Old-school-67', category: 'old-school' },
    { id: '68', imageUrl: '/stickers/Old-school-68.png', name: 'Old-school-68', category: 'old-school' },
    { id: '69', imageUrl: '/stickers/Old-school-69.png', name: 'Old-school-69', category: 'old-school' },
    { id: '70', imageUrl: '/stickers/Old-school-70.png', name: 'Old-school-70', category: 'old-school' },
    { id: '71', imageUrl: '/stickers/Old-school-71.png', name: 'Old-school-71', category: 'old-school' },
    { id: '72', imageUrl: '/stickers/Old-school-72.png', name: 'Old-school-72', category: 'old-school' },
    { id: '73', imageUrl: '/stickers/Old-school-73.png', name: 'Old-school-73', category: 'old-school' },
    { id: '74', imageUrl: '/stickers/Old-school-74.png', name: 'Old-school-74', category: 'old-school' },
    // New Stickers
    { id: '75', imageUrl: '/stickers/new-1.png', name: 'new-1', category: 'new' },
    { id: '76', imageUrl: '/stickers/new-2.png', name: 'new-2', category: 'new' },
    { id: '77', imageUrl: '/stickers/new-3.png', name: 'new-3', category: 'new' },
    { id: '78', imageUrl: '/stickers/new-4.png', name: 'new-4', category: 'new' },
    { id: '79', imageUrl: '/stickers/new-5.png', name: 'new-5', category: 'new' },
    { id: '80', imageUrl: '/stickers/new-6.png', name: 'new-6', category: 'new' },
    { id: '81', imageUrl: '/stickers/new-7.png', name: 'new-7', category: 'new' },
    { id: '82', imageUrl: '/stickers/new-8.png', name: 'new-8', category: 'new' },
    { id: '83', imageUrl: '/stickers/new-9.png', name: 'new-9', category: 'new' },
    { id: '84', imageUrl: '/stickers/new-10.png', name: 'new-10', category: 'new' },
    { id: '85', imageUrl: '/stickers/new-11.png', name: 'new-11', category: 'new' },
    { id: '86', imageUrl: '/stickers/new-12.png', name: 'new-12', category: 'new' },
    { id: '87', imageUrl: '/stickers/new-13.png', name: 'new-13', category: 'new' },
    { id: '88', imageUrl: '/stickers/new-14.png', name: 'new-14', category: 'new' },
    { id: '89', imageUrl: '/stickers/new-15.png', name: 'new-15', category: 'new' },
    { id: '90', imageUrl: '/stickers/new-16.png', name: 'new-16', category: 'new' },
    { id: '91', imageUrl: '/stickers/new-17.png', name: 'new-17', category: 'new' },
    { id: '92', imageUrl: '/stickers/new-18.png', name: 'new-18', category: 'new' },
    { id: '93', imageUrl: '/stickers/new-19.png', name: 'new-19', category: 'new' },
    { id: '94', imageUrl: '/stickers/new-20.png', name: 'new-20', category: 'new' },
    { id: '95', imageUrl: '/stickers/new-21.png', name: 'new-21', category: 'new' },
    { id: '96', imageUrl: '/stickers/new-22.png', name: 'new-22', category: 'new' },
    { id: '97', imageUrl: '/stickers/new-23.png', name: 'new-23', category: 'new' },
    { id: '98', imageUrl: '/stickers/new-24.png', name: 'new-24', category: 'new' },
    { id: '99', imageUrl: '/stickers/new-25.png', name: 'new-25', category: 'new' },
    { id: '100', imageUrl: '/stickers/new-26.png', name: 'new-26', category: 'new' },
    { id: '101', imageUrl: '/stickers/new-27.png', name: 'new-27', category: 'new' },
    { id: '102', imageUrl: '/stickers/new-28.png', name: 'new-28', category: 'new' },
    { id: '103', imageUrl: '/stickers/new-29.png', name: 'new-29', category: 'new' },
    { id: '104', imageUrl: '/stickers/new-30.png', name: 'new-30', category: 'new' },
    { id: '105', imageUrl: '/stickers/new-31.png', name: 'new-31', category: 'new' },
    { id: '106', imageUrl: '/stickers/new-32.png', name: 'new-32', category: 'new' },
    { id: '107', imageUrl: '/stickers/new-33.png', name: 'new-33', category: 'new' },
    { id: '108', imageUrl: '/stickers/new-34.png', name: 'new-34', category: 'new' },
    { id: '109', imageUrl: '/stickers/new-35.png', name: 'new-35', category: 'new' },
    { id: '110', imageUrl: '/stickers/new-36.png', name: 'new-36', category: 'new' },
    { id: '111', imageUrl: '/stickers/new-37.png', name: 'new-37', category: 'new' },
    { id: '112', imageUrl: '/stickers/new-38.png', name: 'new-38', category: 'new' },
    { id: '113', imageUrl: '/stickers/new-39.png', name: 'new-39', category: 'new' },
    { id: '114', imageUrl: '/stickers/new-40.png', name: 'new-40', category: 'new' },
    { id: '115', imageUrl: '/stickers/new-41.png', name: 'new-41', category: 'new' },
    { id: '116', imageUrl: '/stickers/new-42.png', name: 'new-42', category: 'new' },
    { id: '117', imageUrl: '/stickers/new-43.png', name: 'new-43', category: 'new' },
    { id: '118', imageUrl: '/stickers/new-44.png', name: 'new-44', category: 'new' },
    { id: '119', imageUrl: '/stickers/new-45.png', name: 'new-45', category: 'new' },
    { id: '120', imageUrl: '/stickers/new-46.png', name: 'new-46', category: 'new' },
    { id: '121', imageUrl: '/stickers/new-47.png', name: 'new-47', category: 'new' },
    { id: '122', imageUrl: '/stickers/new-48.png', name: 'new-48', category: 'new' },
    { id: '123', imageUrl: '/stickers/new-49.png', name: 'new-49', category: 'new' },
    { id: '124', imageUrl: '/stickers/new-50.png', name: 'new-50', category: 'new' },
    { id: '125', imageUrl: '/stickers/new-51.png', name: 'new-51', category: 'new' },
    { id: '126', imageUrl: '/stickers/new-52.png', name: 'new-52', category: 'new' },
    { id: '127', imageUrl: '/stickers/new-53.png', name: 'new-53', category: 'new' },
    { id: '128', imageUrl: '/stickers/new-54.png', name: 'new-54', category: 'new' },
    { id: '129', imageUrl: '/stickers/new-55.png', name: 'new-55', category: 'new' },
    { id: '130', imageUrl: '/stickers/new-56.png', name: 'new-56', category: 'new' },
    { id: '131', imageUrl: '/stickers/new-57.png', name: 'new-57', category: 'new' },
    { id: '132', imageUrl: '/stickers/new-58.png', name: 'new-58', category: 'new' },
    { id: '133', imageUrl: '/stickers/new-59.png', name: 'new-59', category: 'new' },
    { id: '134', imageUrl: '/stickers/new-60.png', name: 'new-60', category: 'new' },
    { id: '135', imageUrl: '/stickers/new-61.png', name: 'new-61', category: 'new' },
    { id: '136', imageUrl: '/stickers/new-62.png', name: 'new-62', category: 'new' },
    { id: '137', imageUrl: '/stickers/new-63.png', name: 'new-63', category: 'new' },
    { id: '138', imageUrl: '/stickers/new-64.png', name: 'new-64', category: 'new' },
    { id: '139', imageUrl: '/stickers/new-65.png', name: 'new-65', category: 'new' },
    { id: '140', imageUrl: '/stickers/new-66.png', name: 'new-66', category: 'new' },
    { id: '141', imageUrl: '/stickers/new-67.png', name: 'new-67', category: 'new' },
    { id: '142', imageUrl: '/stickers/new-68.png', name: 'new-68', category: 'new' },
    { id: '143', imageUrl: '/stickers/new-69.png', name: 'new-69', category: 'new' },
    { id: '144', imageUrl: '/stickers/new-70.png', name: 'new-70', category: 'new' },
    { id: '141', imageUrl: '/stickers/new-71.png', name: 'new-71', category: 'new' },
    { id: '142', imageUrl: '/stickers/new-72.png', name: 'new-72', category: 'new' },
    { id: '143', imageUrl: '/stickers/new-73.png', name: 'new-73', category: 'new' },
    { id: '144', imageUrl: '/stickers/new-74.png', name: 'new-74', category: 'new' },
  ];

  const addSticker = (stickerData: typeof availableStickers[0]) => {
    const newSticker: Sticker = {
      id: Date.now().toString(),
      emoji: stickerData.imageUrl,
      name: stickerData.name,
      x: Math.random() * 200,
      y: Math.random() * 200,
      rotation: 0,
    };
    setStickers([...stickers, newSticker]);
    setShowStickerModal(false);
  };

  const removeSticker = (id: string) => {
    setStickers(stickers.filter(sticker => sticker.id !== id));
  };

  const updateSticker = (id: string, updates: Partial<Sticker>) => {
    setStickers(stickers.map(sticker => 
      sticker.id === id ? { ...sticker, ...updates } : sticker
    ));
  };

  const addTextOverlay = () => {
    if (!textInput.trim()) return;
    
    const newTextOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: textInput,
      x: Math.random() * 200,
      y: Math.random() * 200,
      style: { ...textStyle },
    };
    setTextOverlays([...textOverlays, newTextOverlay]);
    setTextInput('');
    setShowTextModal(false);
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(text => text.id !== id));
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(textOverlays.map(text => 
      text.id === id ? { ...text, ...updates } : text
    ));
  };

  const handlePost = () => {
    onPost();
  };

  const handleSave = () => {
    onSave();
  };

  const oldSchoolStickers = availableStickers.filter(s => s.category === 'old-school');
  const newStickers = availableStickers.filter(s => s.category === 'new');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-300 hover:text-white"
        >
          <X size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-lg font-semibold">Content Editor</h1>
        <div className="flex space-x-2">
          <Button
            onClick={handleSave}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Save
          </Button>
          <Button
            onClick={handlePost}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Post
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative" style={{ width: "90vw", height: "50vh", margin: "0 auto" }}>
        {mediaType === 'image' ? (
          <img
            src={mediaUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            controls
          />
        )}
        
        {/* Stickers Overlay */}
        {stickers.map(sticker => (
          <DraggableSticker
            key={sticker.id}
            sticker={sticker}
            onUpdate={updateSticker}
            onRemove={removeSticker}
          />
        ))}
        
        {/* Text Overlay */}
        {textOverlays.map(textOverlay => (
          <DraggableText
            key={textOverlay.id}
            textOverlay={textOverlay}
            onUpdate={updateTextOverlay}
            onRemove={removeTextOverlay}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 p-4">
        <Button
          onClick={() => setShowStickerModal(true)}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          Add Stickers
        </Button>
        <Button
          onClick={() => setShowTextModal(true)}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          Add Text
        </Button>
      </div>

      {/* Sticker Modal */}
      {showStickerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Choose Stickers</h2>
            <button
              onClick={() => setShowStickerModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Old School Column */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">Old School</h3>
                <div className="grid grid-cols-3 gap-2">
                  {oldSchoolStickers.map(sticker => (
                    <button
                      key={sticker.id}
                      onClick={() => addSticker(sticker)}
                      className="p-2 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                    >
                      <img
                        src={sticker.imageUrl}
                        alt={sticker.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          maxWidth: '80px',
                          maxHeight: '80px',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* New Column */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">New</h3>
                <div className="grid grid-cols-3 gap-2">
                  {newStickers.map(sticker => (
                    <button
                      key={sticker.id}
                      onClick={() => addSticker(sticker)}
                      className="p-2 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                    >
                      <img
                        src={sticker.imageUrl}
                        alt={sticker.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          maxWidth: '80px',
                          maxHeight: '80px',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Modal */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Add Text</h2>
            <button
              onClick={() => setShowTextModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Text</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter your text..."
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Font Size</label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={textStyle.fontSize}
                  onChange={(e) => setTextStyle({...textStyle, fontSize: parseInt(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-400">{textStyle.fontSize}px</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex space-x-2">
                  {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(color => (
                    <button
                      key={color}
                      onClick={() => setTextStyle({...textStyle, color})}
                      className={`w-8 h-8 rounded border-2 ${textStyle.color === color ? 'border-white' : 'border-gray-600'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <Button
                onClick={addTextOverlay}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!textInput.trim()}
              >
                Add Text
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentEditor; 
