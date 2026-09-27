import React from 'react';
import { Thermometer, Droplets, Gauge, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EnvironmentalConditions, Instrument } from '../../types';

interface EnvironmentalPanelProps {
  conditions: EnvironmentalConditions;
  onChange: (updated: EnvironmentalConditions) => void;
  instrument: Instrument;
  readOnly?: boolean;
}

export const EnvironmentalPanel: React.FC<EnvironmentalPanelProps> = ({
  conditions,
  onChange,
  instrument,
  readOnly = false,
}) => {
  // Parse instrument declared temp range
  let minTemp = -10;
  let maxTemp = 40;
  if (instrument.temperatureRange) {
    const match = instrument.temperatureRange.match(/([+-]?\d+)[^\d]+([+-]?\d+)/);
    if (match) {
      minTemp = parseInt(match[1], 10);
      maxTemp = parseInt(match[2], 10);
    }
  }

  const currentTemp = conditions.temperatureCelsius;
  const isTempOutOfRange =
    currentTemp !== undefined && (currentTemp < minTemp || currentTemp > maxTemp);

  const handleFieldChange = (field: keyof EnvironmentalConditions, value: any) => {
    onChange({
      ...conditions,
      [field]: value,
    });
  };

  return (
    <div className="bg-[#faf8f2] p-4 rounded-md border border-[#ded7c4] space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#ece7d8]">
        <div className="flex items-center space-x-2">
          <Thermometer className="w-4 h-4 text-[#006c51]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gov-sand-800">
            Environmental Test Conditions (OIML R-76 Clause 3.9)
          </h4>
        </div>
        <span className="text-[10px] text-gov-sand-600 font-mono">
          Declared Range: {instrument.temperatureRange || '-10°C to +40°C'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Temperature Field */}
        <div>
          <label className="gov-label text-[11px] flex items-center justify-between">
            <span>Ambient Temp (°C) *</span>
            {currentTemp !== undefined && !isTempOutOfRange && (
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> OK
              </span>
            )}
            {isTempOutOfRange && (
              <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                <AlertCircle className="w-2.5 h-2.5" /> Out of Range
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={conditions.temperatureCelsius ?? ''}
              onChange={(e) =>
                handleFieldChange(
                  'temperatureCelsius',
                  e.target.value === '' ? undefined : parseFloat(e.target.value)
                )
              }
              placeholder="e.g. 21.5"
              disabled={readOnly}
              className={`gov-input text-xs ${
                isTempOutOfRange ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-bold' : ''
              }`}
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">°C</span>
          </div>
          {isTempOutOfRange && (
            <p className="text-[10px] text-amber-700 mt-0.5">
              Instrument calibrated for {minTemp}°C to {maxTemp}°C. Flagged for review.
            </p>
          )}
        </div>

        {/* Humidity Field */}
        <div>
          <label className="gov-label text-[11px]">Relative Humidity (%)</label>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={conditions.relativeHumidity ?? ''}
              onChange={(e) =>
                handleFieldChange(
                  'relativeHumidity',
                  e.target.value === '' ? undefined : parseFloat(e.target.value)
                )
              }
              placeholder="e.g. 55"
              disabled={readOnly}
              className="gov-input text-xs"
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">% RH</span>
          </div>
        </div>

        {/* Atmospheric Pressure Field */}
        <div>
          <label className="gov-label text-[11px]">Atmospheric Pressure</label>
          <div className="relative">
            <input
              type="number"
              step="1"
              value={conditions.atmosphericPressureHpa ?? ''}
              onChange={(e) =>
                handleFieldChange(
                  'atmosphericPressureHpa',
                  e.target.value === '' ? undefined : parseFloat(e.target.value)
                )
              }
              placeholder="e.g. 1013"
              disabled={readOnly}
              className="gov-input text-xs"
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-gov-sand-500">hPa</span>
          </div>
        </div>

        {/* Instrument Spirit Level Check */}
        <div>
          <label className="gov-label text-[11px]">Leveling Status</label>
          <div className="flex items-center h-[34px] px-3 bg-white rounded border border-[#ded7c4]">
            <label className="flex items-center space-x-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={conditions.isInstrumentLevel ?? true}
                onChange={(e) => handleFieldChange('isInstrumentLevel', e.target.checked)}
                disabled={readOnly}
                className="w-3.5 h-3.5 text-[#006c51] rounded border-gov-sand-300 focus:ring-[#006c51]"
              />
              <span className="font-medium text-gov-sand-800 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#006c51]" />
                Bubble Centered
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
        <div>
          <label className="gov-label text-[11px]">Calibration Weights Certificate Ref.</label>
          <input
            type="text"
            value={conditions.standardWeightsCertificate ?? ''}
            onChange={(e) => handleFieldChange('standardWeightsCertificate', e.target.value)}
            placeholder="e.g. NPL/MET/2026/F1-CLASS/9941"
            disabled={readOnly}
            className="gov-input text-xs font-mono"
          />
        </div>
        <div>
          <label className="gov-label text-[11px]">Environmental Stability Remarks</label>
          <input
            type="text"
            value={conditions.notes ?? ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="e.g. Controlled metrology room, vibration-isolated marble slab."
            disabled={readOnly}
            className="gov-input text-xs"
          />
        </div>
      </div>
    </div>
  );
};
