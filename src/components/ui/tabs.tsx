/**
 * Tab Component
 * Provides tabbed navigation for organizing content
 */
'use client';

import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;

  const handleSetActiveTab = (tab: string) => {
    if (onValueChange) {
      onValueChange(tab);
    } else {
      setInternalValue(tab);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  icon?: string;
  badge?: number;
}

export function TabsTrigger({ value, children, className = '', icon, badge }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-3 text-sm font-medium transition-all relative ${
        isActive
          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span>{children}</span>
        {badge !== undefined && badge > 0 && (
          <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
            isActive
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return <div className={className}>{children}</div>;
}
