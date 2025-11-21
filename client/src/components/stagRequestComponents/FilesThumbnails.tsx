import { useState, useEffect } from 'react';
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ImageIcon from "@mui/icons-material/Image";
import CarouselSlider from "./CarouselSlider";
import ModalContainer from "./ModalContainer";
import { Box, Typography, Tooltip } from "@mui/material";

const thumbnailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  gap: "10px",
  marginTop: "10px",
};

const thumbnailContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  width: "100%",
  height: "120px",
  overflow: "hidden",
  borderRadius: "4px",
  marginBottom: "10px",
  border: "1px solid #d3d3d3",
  position: "relative",
  backgroundColor: "#374151",
};

const thumbnailStyles = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "flex",
  alignItems: "center",
};

const thumbnailImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const deleteIconStyle = {
  margin: "5px",
  color: "error.main",
  cursor: "pointer",
  backgroundColor: "#fff",
  position: "absolute",
  zIndex: 2,
  borderRadius: "50%",
  width: "24px",
  height: "24px",
};

const thumbnailWrapperStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  cursor: "pointer",
  padding: "8px",
};

const fileIconStyle = {
  fontSize: 48,
  color: "#06B6D4",
};

const fileNameStyle = {
  fontSize: "10px",
  color: "#D1D5DB",
  textAlign: "center",
  marginTop: "4px",
  wordBreak: "break-word",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

interface FileItem {
  name: string;
  type: string;
  src?: string;
  isExisting?: boolean;
  isJiraAttachment?: boolean;
  imageUrl?: string;
  imageThumbnail?: string;
  mimeType?: string;
  id?: string;
}

interface FilesThumbnailsProps {
  label: string;
  initialData: FileItem[];
  onUpdateFiles: (files: FileItem[]) => void;
}

const FilesThumbnails: React.FC<FilesThumbnailsProps> = ({ label, initialData, onUpdateFiles }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<FileItem[]>([]);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  // Get proxy URL for Jira attachments
  const getProxyUrl = (jiraUrl: string) => {
    if (!jiraUrl) return '';
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    return `${baseUrl}/api/stagRequests/proxy/jira-file?url=${encodeURIComponent(jiraUrl)}`;
  };

  // Process files when initialData changes
  useEffect(() => {
    const processFiles = () => {
      console.log("Processing initialData:", initialData);
      const filesWithSrc = initialData.map((file) => {
        // If it's a Jira attachment, use proxy URL for images
        if (file.isJiraAttachment) {
          // For images, use proxy URL to handle authentication
          const isImage = file.mimeType?.startsWith("image/") || file.type?.startsWith("image/");
          let src = file.imageThumbnail || file.imageUrl || file.src;
          
          if (isImage && src) {
            src = getProxyUrl(src);
          }
          
          const processedFile = {
            ...file,
            src: src
          };
          console.log("Processed Jira attachment:", processedFile);
          return processedFile;
        }
        
        // For non-Jira files, keep existing src
        return file;
      });
      setProcessedFiles(filesWithSrc);
      // Reset image load errors when files change
      setImageLoadErrors(new Set());
    };

    processFiles();
  }, [initialData]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      processedFiles.forEach(file => {
        if (file.src && file.src.startsWith('blob:') && !file.isJiraAttachment) {
          URL.revokeObjectURL(file.src);
        }
      });
    };
  }, [processedFiles]);

  const handleAttachmentsClick = (index: number) => {
    const file = processedFiles[index];
    console.log("Clicked on file:", file);
    
    // Open modal for image files that have src (both Jira attachments and local files)
    const isImageFile = file.type.startsWith("image/") || 
                       file.mimeType?.startsWith("image/") ||
                       (file.src && file.src.startsWith('data:image/'));
    
    const hasValidSource = file.src || file.imageUrl;
    
    if (file && hasValidSource && isImageFile) {
      setSelectedImageIndex(index);
      setAttachmentsModalOpen(true);
    } else {
      console.log("File cannot be previewed:", {
        name: file.name,
        type: file.type,
        mimeType: file.mimeType,
        src: file.src,
        imageUrl: file.imageUrl,
        isImage: isImageFile,
        hasSource: hasValidSource
      });
    }
  };

  const handleImageError = (fileId: string) => {
    console.log("Image failed to load for file:", fileId);
    setImageLoadErrors(prev => new Set(prev).add(fileId));
  };

  const removeFile = (index: number) => {
    const fileToRemove = processedFiles[index];
    
    // Revoke object URL if it exists and is a blob URL (not Jira attachment)
    if (fileToRemove.src && fileToRemove.src.startsWith('blob:') && !fileToRemove.isJiraAttachment) {
      URL.revokeObjectURL(fileToRemove.src);
    }
    
    // Create new array without the removed file
    const updatedFiles = processedFiles.filter((_, i) => i !== index);
    
    // Update local state
    setProcessedFiles(updatedFiles);
    
    // Notify parent component
    onUpdateFiles(updatedFiles);
  };

  const getFileIcon = (file: FileItem) => {
    const fileId = file.id || file.name;
    const hasImageLoadError = imageLoadErrors.has(fileId);
    
    console.log("Rendering file icon:", {
      name: file.name,
      type: file.type,
      mimeType: file.mimeType,
      src: file.src,
      isJira: file.isJiraAttachment,
      hasError: hasImageLoadError
    });

    // Check if we should show image
    const shouldShowImage = !hasImageLoadError && 
                           (file.type.startsWith("image/") || file.mimeType?.startsWith("image/")) && 
                           file.src;

    if (shouldShowImage) {
      console.log("Showing image for file:", file.name, "with src:", file.src);
      return (
        <img
          src={file.src}
          alt={file.name}
          style={thumbnailImageStyle}
          onError={() => handleImageError(fileId)}
          onLoad={() => console.log("Image loaded successfully:", file.name)}
        />
      );
    }

    // Show appropriate icon based on file type
    if (file.type === "application/pdf" || file.mimeType === "application/pdf") {
      return <PictureAsPdfIcon sx={fileIconStyle} />;
    } else if (file.type.startsWith("image/") || file.mimeType?.startsWith("image/")) {
      return <ImageIcon sx={fileIconStyle} />;
    } else {
      return <InsertDriveFileIcon sx={fileIconStyle} />;
    }
  };

  const getImageFiles = () => {
    const imageFiles = processedFiles.filter(file => {
      const isImage = file.type.startsWith("image/") || 
                     file.mimeType?.startsWith("image/") ||
                     (file.src && file.src.startsWith('data:image/'));
      
      const hasSource = file.src || file.imageUrl;
      const fileId = file.id || file.name;
      const hasError = imageLoadErrors.has(fileId);
      
      return isImage && hasSource && !hasError;
    });
    
    console.log("Filtered image files for carousel:", imageFiles);
    return imageFiles;
  };

  const getCarouselAttachments = () => {
    return getImageFiles().map(file => {
      // For Jira attachments, use proxy URL for carousel
      let carouselSrc = file.src;
      
      if (file.isJiraAttachment && file.imageUrl) {
        // Use proxy URL for Jira images in carousel
        carouselSrc = getProxyUrl(file.imageUrl);
      }
      
      return {
        ...file,
        src: carouselSrc,
        type: file.mimeType || file.type
      };
    });
  };

  const getSelectedImageIndexInCarousel = () => {
    if (selectedImageIndex === null) return 0;
    
    const imageFiles = getImageFiles();
    const selectedFile = processedFiles[selectedImageIndex];
    
    if (!selectedFile) return 0;
    
    const indexInCarousel = imageFiles.findIndex(file => 
      file.id === selectedFile.id || file.name === selectedFile.name
    );
    
    return indexInCarousel >= 0 ? indexInCarousel : 0;
  };

  return (
    <>
      {processedFiles.length > 0 && (
        <>
          <Grid item xs={12} md={12}>
            {label && (
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  marginTop: "20px", 
                  marginBottom: "10px",
                  color: "white",
                  fontWeight: 500 
                }}
              >
                {label}
              </Typography>
            )}
            <Box sx={thumbnailGridStyle}>
              {processedFiles.map((file, index) => {
                const fileId = file.id || `${file.name}-${index}`;
                
                return (
                  <Tooltip 
                    key={fileId} 
                    title={file.name}
                    placement="top"
                  >
                    <Box sx={thumbnailContainerStyle}>
                      <Box
                        sx={thumbnailWrapperStyle}
                        onClick={() => handleAttachmentsClick(index)}
                      >
                        {getFileIcon(file)}
                        <Typography sx={fileNameStyle}>
                          {file.name}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        sx={deleteIconStyle}
                        size="small"
                      >
                        <DeleteIcon color="error" fontSize="small" />
                      </IconButton>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Grid>
          
          {/* Modal for image preview */}
          <ModalContainer
            isOpen={attachmentsModalOpen}
            onClose={() => {
              setAttachmentsModalOpen(false);
              setSelectedImageIndex(null);
            }}
          >
            {selectedImageIndex !== null && getImageFiles().length > 0 && (
              getImageFiles().length === 1 ? (
                <img
                  src={getCarouselAttachments()[0].src}
                  alt="Attachment"
                  style={{ 
                    width: "100%", 
                    maxHeight: "80vh", 
                    objectFit: "contain", 
                    marginBottom: "16px" 
                  }}
                  onError={(e) => {
                    console.error("Failed to load image in carousel:", e);
                  }}
                  onLoad={() => console.log("Carousel image loaded successfully")}
                />
              ) : (
                <CarouselSlider
                  attachments={getCarouselAttachments()}
                  selectedIndex={getSelectedImageIndexInCarousel()}
                />
              )
            )}
          </ModalContainer>
        </>
      )}
    </>
  );
};

export default FilesThumbnails;