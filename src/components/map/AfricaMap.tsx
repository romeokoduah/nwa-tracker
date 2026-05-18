import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import worldData from '@/assets/world-110m.json';
import { useNwaStore } from '@/store/useNwaStore';
import {
  overallCompletion,
  countryCompletionBucket,
  hasReviewerFeedback,
} from '@/lib/derive';
import { FEEDBACK_COLOR } from '@/lib/constants';
import type { Country } from '@/lib/types';
import { COMPLETION_BUCKETS } from '@/lib/types';
import { MapTooltip } from './MapTooltip';
import { MapLegend } from './MapLegend';

const TOPO_NAME_TO_COUNTRY: Record<string, string> = {
  Angola: 'Angola',
  Benin: 'Benin',
  Botswana: 'Botswana',
  'Burkina Faso': 'Burkina Faso',
  Burundi: 'Burundi',
  Cameroon: 'Cameroon',
  'Central African Rep.': 'Central African Republic',
  Chad: 'Chad',
  'Dem. Rep. Congo': 'DR Congo',
  Congo: 'Congo',
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Cote d'Ivoire": "Côte d'Ivoire",
  Djibouti: 'Djibouti',
  'Eq. Guinea': 'Equatorial Guinea',
  Eritrea: 'Eritrea',
  Eswatini: 'Eswatini',
  Swaziland: 'Eswatini',
  Ethiopia: 'Ethiopia',
  Gabon: 'Gabon',
  Gambia: 'Gambia',
  Ghana: 'Ghana',
  Guinea: 'Guinea',
  'Guinea-Bissau': 'Guinea-Bissau',
  Kenya: 'Kenya',
  Lesotho: 'Lesotho',
  Liberia: 'Liberia',
  Madagascar: 'Madagascar',
  Malawi: 'Malawi',
  Mali: 'Mali',
  Mauritania: 'Mauritania',
  Mozambique: 'Mozambique',
  Namibia: 'Namibia',
  Niger: 'Niger',
  Nigeria: 'Nigeria',
  Rwanda: 'Rwanda',
  Senegal: 'Senegal',
  'Sierra Leone': 'Sierra Leone',
  Somalia: 'Somalia',
  'S. Sudan': 'South Sudan',
  'South Sudan': 'South Sudan',
  'South Africa': 'South Africa',
  Tanzania: 'Tanzania',
  Togo: 'Togo',
  Uganda: 'Uganda',
  Zambia: 'Zambia',
  Zimbabwe: 'Zimbabwe',
};

const NORTH_AFRICA_NAMES = new Set([
  'Algeria',
  'Egypt',
  'Libya',
  'Morocco',
  'Tunisia',
  'Sudan',
  'W. Sahara',
  'Western Sahara',
]);

function bucketFill(b: 0 | 1 | 2 | 3 | 4) {
  return COMPLETION_BUCKETS[b].color;
}

interface AfricaMapProps {
  height?: number;
}

export function AfricaMap({ height = 480 }: AfricaMapProps) {
  const countries = useNwaStore((s) => s.countries);
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<{
    country: Country | null;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const byName = useMemo(() => {
    const m = new Map<string, Country>();
    for (const c of countries) m.set(c.name, c);
    return m;
  }, [countries]);

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 380, center: [18, 1] }}
        width={800}
        height={height}
        style={{ width: '100%', height: 'auto' }}
      >
        <ZoomableGroup zoom={1} center={[18, 1]} minZoom={0.8} maxZoom={3}>
          <Geographies geography={worldData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const topoName = String(geo.properties?.name ?? '');
                const mapped = TOPO_NAME_TO_COUNTRY[topoName];
                const country = mapped ? byName.get(mapped) : undefined;
                const isNorth = NORTH_AFRICA_NAMES.has(topoName);
                const isInScope = !!country;

                let fill = '#F1F5F9';
                let stroke = '#CBD5E1';
                if (isInScope && country) {
                  fill = hasReviewerFeedback(country)
                    ? FEEDBACK_COLOR
                    : bucketFill(countryCompletionBucket(country));
                  stroke = 'rgba(255,255,255,0.6)';
                } else if (isNorth) {
                  fill = '#E2E8F0';
                  stroke = '#CBD5E1';
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        outline: 'none',
                        filter: isInScope ? 'brightness(1.08)' : undefined,
                        cursor: isInScope ? 'pointer' : 'not-allowed',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e) => {
                      setHovered({
                        country: country ?? null,
                        name: isNorth ? `${topoName} (out of scope)` : (country?.name ?? topoName),
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseMove={(e) =>
                      setHovered((h) =>
                        h ? { ...h, x: e.clientX, y: e.clientY } : h,
                      )
                    }
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      if (country) navigate(`/countries/${country.id}`);
                    }}
                  >
                    <title>
                      {country
                        ? `${country.name} — ${(overallCompletion(country) * 100).toFixed(0)}%`
                        : isNorth
                          ? `${topoName} — out of scope`
                          : topoName}
                    </title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      <MapLegend className="absolute bottom-2 right-2" />

      {hovered && (
        <MapTooltip
          name={hovered.name}
          country={hovered.country ?? undefined}
          x={hovered.x}
          y={hovered.y}
        />
      )}
    </div>
  );
}
