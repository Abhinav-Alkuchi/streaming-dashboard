import {
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";
import Slider from "react-slick";

const CarouselSlider = ({attachments, selectedIndex=0}) => {
    const settings = {
      dots: true,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
    };

    return (
      <Slider {...settings} initialSlide={selectedIndex}>
        {attachments.map((attachment, index) => (
          <div key={index} style={{ width:"70%", textAlign: "center" }}>
            {attachment.type.startsWith("image/") ? (
              <img
                src={attachment.src}
                alt={`Attachment ${index + 1}`}
                style={{ width: "100%", marginBottom: "16px" }}
              />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%"
                }}
              >
                <FileIcon fontSize="large" />
                <p>{attachment.name}</p>
                <a
                  href={attachment.src}
                  download={attachment.name}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                    marginTop: "8px",
                  }}
                >
                  Download
                </a>
              </div>
            )}
          </div>
        ))}
      </Slider>
    );
  };

  export default CarouselSlider;