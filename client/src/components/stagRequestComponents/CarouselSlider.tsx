import {
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";
import Slider from "react-slick";
import { useState, useEffect } from "react";

const CarouselSlider = ({ attachments, selectedIndex = 0 }) => {
  const [loadedImages, setLoadedImages] = useState({});
  const [failedImages, setFailedImages] = useState({});
  const [processedAttachments, setProcessedAttachments] = useState([]);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  // Get proxy URL for Jira attachments
  const getProxyUrl = (jiraUrl: string) => {
    if (!jiraUrl) return '';
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    return `${baseUrl}/api/stagRequests/proxy/jira-file?url=${encodeURIComponent(jiraUrl)}`;
  };

  // Process attachments to use proxy URLs for Jira images
  useEffect(() => {
    const processAttachments = () => {
      console.log("Processing carousel attachments:", attachments);
      
      const processed = attachments.map((attachment, index) => {
        // If it's a Jira attachment and an image, use proxy URL
        if (attachment.isJiraAttachment && 
            (attachment.type?.startsWith("image/") || attachment.mimeType?.startsWith("image/"))) {
          
          const originalUrl = attachment.imageUrl || attachment.src;
          const proxyUrl = getProxyUrl(originalUrl);
          
          console.log(`Jira image ${index}:`, {
            originalUrl,
            proxyUrl,
            name: attachment.name
          });
          
          return {
            ...attachment,
            src: proxyUrl,
            originalUrl: originalUrl, // Keep original for fallback
            type: attachment.mimeType || attachment.type
          };
        }
        
        // For non-Jira images or non-images, keep as is
        return {
          ...attachment,
          originalUrl: attachment.src
        };
      });
      
      setProcessedAttachments(processed);
      console.log("Processed carousel attachments:", processed);
    };

    processAttachments();
  }, [attachments]);

  // Debug: Log attachments on component mount
  useEffect(() => {
    console.log("Carousel processed attachments:", processedAttachments);
    console.log("Selected index:", selectedIndex);
  }, [processedAttachments, selectedIndex]);

  const handleImageLoad = (index) => {
    console.log(`Image ${index} loaded successfully`);
    setLoadedImages(prev => ({ ...prev, [index]: true }));
    setFailedImages(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index, attachment) => {
    console.error(`Image ${index} failed to load:`, attachment.src);
    
    // If this is a Jira attachment that failed with proxy, try direct URL as fallback
    if (attachment.isJiraAttachment && attachment.originalUrl && attachment.src !== attachment.originalUrl) {
      console.log(`Trying fallback to original URL for ${index}:`, attachment.originalUrl);
      
      // Update the processed attachments to use original URL
      const updatedAttachments = [...processedAttachments];
      updatedAttachments[index] = {
        ...updatedAttachments[index],
        src: attachment.originalUrl
      };
      setProcessedAttachments(updatedAttachments);
      
      // Reset error state for this index to try again
      setFailedImages(prev => ({ ...prev, [index]: false }));
      setLoadedImages(prev => ({ ...prev, [index]: false }));
    } else {
      setFailedImages(prev => ({ ...prev, [index]: true }));
      setLoadedImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const isImageBroken = (index) => {
    return failedImages[index] === true;
  };

  const isImageType = (attachment) => {
    return attachment.type?.startsWith("image/") || 
           attachment.mimeType?.startsWith("image/") ||
           (attachment.src && attachment.src.startsWith('data:image/'));
  };

  return (
    <Slider {...settings} initialSlide={selectedIndex} style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px" }}>
      {processedAttachments.map((attachment, index) => {
        const isImage = isImageType(attachment);
        const isBroken = isImageBroken(index);
        
        console.log(`Rendering carousel attachment ${index}:`, {
          name: attachment.name,
          type: attachment.type,
          src: attachment.src,
          isImage,
          isBroken,
          isJira: attachment.isJiraAttachment
        });

        return (
          <div key={index} style={{ width: "70%", textAlign: "center", margin: "0 auto" }}>
            {isImage && !isBroken ? (
              <div style={{ position: "relative" }}>
                <img
                  src={attachment.src}
                  alt={`Attachment ${index + 1}`}
                  style={{ 
                    width: "100%", 
                    maxHeight: "400px",
                    objectFit: "contain",
                    marginBottom: "16px" 
                  }}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index, attachment)}
                />
                {/* {attachment.isJiraAttachment && (
                  <div style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px"
                  }}>
                    Jira
                  </div>
                )} */}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                  padding: "20px",
                  backgroundColor: "#1F2937",
                  borderRadius: "8px",
                  margin: "10px"
                }}
              >
                <FileIcon fontSize="large" style={{ color: "#06B6D4", marginBottom: "16px" }} />
                <p style={{ margin: "10px 0", color: "white", fontSize: "16px" }}>
                  {attachment.name}
                </p>
                {attachment.isJiraAttachment && (
                  <span style={{
                    backgroundColor: "#06B6D4",
                    color: "black",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    marginBottom: "8px"
                  }}>
                    Jira Attachment
                  </span>
                )}
                <a
                  href={attachment.src}
                  download={attachment.name}
                  style={{
                    textDecoration: "none",
                    color: "#06B6D4",
                    display: "block",
                    marginTop: "8px",
                    padding: "8px 16px",
                    border: "1px solid #06B6D4",
                    borderRadius: "4px",
                    transition: "all 0.3s"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#06B6D4";
                    e.target.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#06B6D4";
                  }}
                >
                  Download File
                </a>
                {isBroken && isImage && (
                  <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "8px" }}>
                    Failed to load image preview
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </Slider>
  );
};

export default CarouselSlider;