import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pages: number;
  fileObj: File;
  mode: "bw" | "color" | "mixed";
  copies: number;
  isTwoSided: boolean;
  originalPageCount: number;
  printRange: "all" | "custom";
  customRangeString: string;
  colorPagesString: string;
  paperSize: "a4" | "letter";
}

interface FilesContextType {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  clearFiles: () => void;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export const FilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const value = useMemo(() => ({
    files,
    setFiles,
    clearFiles
  }), [files, clearFiles]);

  return (
    <FilesContext.Provider value={value}>
      {children}
    </FilesContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FilesContext);
  if (context === undefined) {
    throw new Error('useFiles must be used within a FilesProvider');
  }
  return context;
};
