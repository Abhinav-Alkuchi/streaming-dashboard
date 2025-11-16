import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { useState, useRef, useEffect } from "react";
import type { StoreModeRow } from "../../types";
import { stateNameToCode } from "../../mock/states";
import { statesGeo } from "../../mock/states-10m";
import { provinceNameToCode, codeToProvinceName, canadaGeo } from "../../mock/canada-provinces"

interface StoreModeMapProps {
  data: StoreModeRow[];
  selectedState: string;
  selectedCountry: string;
  onStateClick: (state: string) => void;
}

const codeToStateName: Record<string, string> = Object.fromEntries(
  Object.entries(stateNameToCode).map(([name, code]) => [code, name])
);

const StoreModeMap = ({ data, selectedState, selectedCountry, onStateClick }: StoreModeMapProps) => {
  const [tooltip, setTooltip] = useState<{
    content: string;
    x: number;
    y: number;
    stateName: string;
  } | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the appropriate geography data based on country
  const getGeographyData = () => {
    if (selectedCountry === "CA") {
      return {
        geographies: canadaGeo,
        nameKey: "properties.name",
        projection: "geoMercator",
        projectionConfig: {
          scale: 500,
          center: [-95, 60] as [number, number]
        }
      };
    }
    return {
      geographies: statesGeo,
      nameKey: "properties.name", 
      projection: "geoAlbersUsa",
      projectionConfig: {
        scale: 800
      }
    };
  };

  // Get region code mapping based on country
  const getRegionCodeMapping = () => {
    if (selectedCountry === "CA") {
      return provinceNameToCode;
    }
    return stateNameToCode;
  };

  // Calculate region-level statistics
  const getRegionData = () => {
    const regionStats: Record<
      string,
      {
        totalEvents: number;
        fill: string;
        regionName: string;
        stores: { store_id: string; store_type: string; events: number }[];
        topStores: string[];
        uniqueStores: number;
        storeTypes: string[];
      }
    > = {};

    const regionMapping = getRegionCodeMapping();
    
    // Initialize all regions with zero events
    Object.values(regionMapping).forEach((regionCode) => {
      const regionName = selectedCountry === "CA" 
        ? codeToProvinceName[regionCode] || regionCode
        : codeToStateName[regionCode] || regionCode;
        
      regionStats[regionCode] = {
        totalEvents: 0,
        fill: "#6B7280",
        regionName: regionName,
        stores: [],
        topStores: [],
        uniqueStores: 0,
        storeTypes: [],
      };
    });

    // Filter data by selected country first
    const countryData = data.filter(row => 
      (row.country || "USA") === selectedCountry
    );

    // Count events by region from actual data
    countryData.forEach((row) => {
      if (row.state) {
        const regionKey = row.state.toUpperCase();
        if (!regionStats[regionKey]) {
          const regionName = selectedCountry === "CA"
            ? codeToProvinceName[regionKey] || regionKey
            : codeToStateName[regionKey] || regionKey;
            
          regionStats[regionKey] = {
            totalEvents: row.count,
            fill: "#6B7280",
            regionName: regionName,
            stores: [],
            topStores: [],
            uniqueStores: 0,
            storeTypes: [],
          };
        } else {
          regionStats[regionKey].totalEvents += row.count;
        }

        // Add store information
        if (row.store_id && row.store_type) {
          const existingStore = regionStats[regionKey].stores.find(
            (store) => store.store_id === row.store_id
          );

          if (existingStore) {
            existingStore.events += row.count;
          } else {
            regionStats[regionKey].stores.push({
              store_id: row.store_id,
              store_type: row.store_type,
              events: row.count,
            });
          }
        }
      }
    });

    // Calculate top stores for each region and assign colors
    Object.keys(regionStats).forEach((region) => {
      const stats = regionStats[region];
      const events = stats.totalEvents;

      // Sort stores by event count and get top 3
      stats.stores.sort((a, b) => b.events - a.events);
      stats.topStores = stats.stores
        .slice(0, 3)
        .map((store) => `${store.store_id} (${store.events.toLocaleString()})`);

      // Calculate unique stores and store types
      stats.uniqueStores = stats.stores.length;
      stats.storeTypes = [
        ...new Set(stats.stores.map((store) => store.store_type)),
      ];

      // Assign colors based on event count
      if (events > 1000) {
        stats.fill = "#10B981"; // Green for high activity
      } else if (events > 500) {
        stats.fill = "#34D399"; // Light green for medium-high
      } else if (events > 100) {
        stats.fill = "#F59E0B"; // Yellow for medium activity
      } else if (events > 0) {
        stats.fill = "#3B82F6"; // Blue for low activity
      } else {
        stats.fill = "#6B7280"; // Gray for no data
      }
    });

    return regionStats;
  };

  const regionData = getRegionData();
  const geographyConfig = getGeographyData();

  const getRegionCodeFromName = (regionName: string): string => {
    const normalizedName = regionName.toLowerCase();
    const mapping = getRegionCodeMapping();
    return mapping[normalizedName] || regionName;
  };

  const getRegionFill = (regionName: string) => {
    const regionCode = getRegionCodeFromName(regionName);

    if (selectedState === regionCode) {
      return "#EC4899"; // Pink for selected region
    }

    return regionData[regionCode]?.fill || "#6B7280";
  };

  const formatStoreType = (storeType: string) => {
    if (!storeType || storeType.toLowerCase() === "unknown") return "Unknown";
    return storeType
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const getRegionTooltipContent = (regionName: string) => {
    const regionCode = getRegionCodeFromName(regionName);
    const stats = regionData[regionCode];

    if (!stats || stats.totalEvents === 0) {
      return `<div style="min-width: 200px;">
        <strong>${regionName}</strong><br/>
        <em>No store data available</em>
      </div>`;
    }

    const storeTypes = stats.storeTypes.map(formatStoreType);
    const topStoresText =
      stats.topStores.length > 0
        ? stats.topStores.join("<br/>")
        : "No store data";

    return `
      <div style="min-width: 240px;">
        <strong style="font-size: 13px;">${regionName} (${regionCode})</strong>
        <hr style="margin: 6px 0; border: none; border-top: 1px solid #374151;" />
        <div style="font-size: 11px; line-height: 1.4;">
          <strong>Total Events:</strong> ${stats.totalEvents.toLocaleString()}<br/>
          <strong>Unique Stores:</strong> ${stats.uniqueStores}<br/>
          <strong>Store Types:</strong> ${storeTypes.join(", ")}<br/>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #374151;" />
          <strong>Top Stores:</strong><br/>
          ${topStoresText}
        </div>
      </div>
    `;
  };

  const handleRegionClick = (regionName: string) => {
    const regionCode = getRegionCodeFromName(regionName);
    console.log(`Map clicked: ${regionName} -> ${regionCode}`);
    onStateClick(regionCode);
  };

  const handleMouseEnter = (event: React.MouseEvent, regionName: string) => {
    if (!containerRef.current || isTransitioning) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;

    const tooltipContent = getRegionTooltipContent(regionName);
    setTooltip({
      content: tooltipContent,
      x: x,
      y: y,
      stateName: regionName,
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!tooltip || !containerRef.current || isTransitioning) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;

    setTooltip((prev) =>
      prev
        ? {
            ...prev,
            x: x,
            y: y,
          }
        : null
    );
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Handle country change with transition
  const handleCountryChange = () => {
    setIsTransitioning(true);
    setTooltip(null); // Hide tooltip during transition
    
    // Reset transition after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  // Call handleCountryChange when selectedCountry changes
  useEffect(() => {
    handleCountryChange();
  }, [selectedCountry]);

  return (
    <div
      ref={containerRef}
      style={{ 
        position: "relative", 
        width: "100%", 
        height: "500px",
        overflow: "hidden"
      }}
      onMouseMove={handleMouseMove}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          opacity: isTransitioning ? 0.7 : 1,
          transform: isTransitioning ? "scale(0.98)" : "scale(1)",
          transition: "all 0.3s ease-in-out",
          filter: isTransitioning ? "blur(1px)" : "blur(0px)",
        }}
      >
        <ComposableMap
          key={`map-${selectedCountry}`} // Force re-render on country change
          projection={geographyConfig.projection}
          projectionConfig={geographyConfig.projectionConfig}
          style={{ 
            width: "100%", 
            height: "100%",
            transition: "all 0.3s ease-in-out"
          }}
        >
          <Geographies geography={geographyConfig.geographies}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const regionName = geo.properties.name;
                const fillColor = getRegionFill(regionName);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#FFFFFF"
                    strokeWidth={0.5}
                    style={{
                      default: { 
                        outline: "none",
                        transition: "fill 0.2s ease-in-out"
                      },
                      hover: {
                        fill: "#8B5CF6",
                        outline: "none",
                        cursor: isTransitioning ? "default" : "pointer",
                        transition: "fill 0.2s ease-in-out"
                      },
                      pressed: {
                        fill: "#EC4899",
                        outline: "none",
                        transition: "fill 0.1s ease-in-out"
                      },
                    }}
                    onMouseEnter={(event: React.MouseEvent) =>
                      !isTransitioning && handleMouseEnter(event, regionName)
                    }
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      if (!isTransitioning) {
                        handleRegionClick(regionName);
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Custom Tooltip */}
      {tooltip && !isTransitioning && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + containerRef.current!.getBoundingClientRect().left + 10,
            top: tooltip.y + containerRef.current!.getBoundingClientRect().top - 10,
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "12px",
            pointerEvents: "none",
            zIndex: 999999,
            maxWidth: "280px",
            border: "1px solid #374151",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            transform: "translateY(-100%)",
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.2s ease-in-out",
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}

      {/* Map Legend */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #374151",
          fontSize: "11px",
          color: "#D1D5DB",
          zIndex: 100,
          minWidth: "160px",
          opacity: isTransitioning ? 0.7 : 1,
          transition: "all 0.3s ease-in-out",
          transform: isTransitioning ? "translateX(10px)" : "translateX(0)",
        }}
      >
        <div
          style={{ marginBottom: "8px", fontWeight: "bold", fontSize: "12px" }}
        >
          Event Activity - {selectedCountry === "CA" ? "Canada" : "USA"}
        </div>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#10B981",
              borderRadius: "2px",
              marginRight: "6px",
            }}
          />
          <span>High (1000+)</span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#F59E0B",
              borderRadius: "2px",
              marginRight: "6px",
            }}
          />
          <span>Medium (100-999)</span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#3B82F6",
              borderRadius: "2px",
              marginRight: "6px",
            }}
          />
          <span>Low (1-99)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#6B7280",
              borderRadius: "2px",
              marginRight: "6px",
            }}
          />
          <span>No Data</span>
        </div>
        <div style={{ marginTop: "8px", fontSize: "10px", color: "#9CA3AF" }}>
          {isTransitioning ? "Loading..." : "Hover for store details"}
        </div>
      </div>

      {/* Loading overlay during transition */}
      {isTransitioning && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(17, 24, 39, 0.9)",
              color: "white",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              border: "1px solid #374151",
            }}
          >
            Switching to {selectedCountry === "CA" ? "Canada" : "USA"} map...
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreModeMap;