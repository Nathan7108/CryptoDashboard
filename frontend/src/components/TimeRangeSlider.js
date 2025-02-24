import React from 'react';
import Slider, { Range } from 'rc-slider';
import 'rc-slider/assets/index.css';

function TimeRangeSlider({ min, max, value, onRangeChange, preset }) {
  // Format a timestamp as "YYYY-MM-DD hh:mm:ss AM/PM"
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).replace(',', '');
  };

  // Dynamically format duration based on the time difference
  const formatDuration = (duration) => {
    const oneDay = 86400000;
    const oneHour = 3600000;
    const oneMinute = 60000;
    if (duration >= oneDay) {
      return `${(duration / oneDay).toFixed(1)} days`;
    } else if (duration >= oneHour) {
      return `${(duration / oneHour).toFixed(1)} hours`;
    } else if (duration >= oneMinute) {
      return `${(duration / oneMinute).toFixed(1)} minutes`;
    } else {
      return `${(duration / 1000).toFixed(1)} seconds`;
    }
  };

  return (
    <div style={{ position: 'relative', margin: '20px auto', width: '1379px', height: '73px' }}>
      {/* Label Box Above the Slider (33px high) */}
      <div
        style={{
          height: '33px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#000',
          padding: '0 10px',
        }}
      >
        <div>{formatDate(value[0])}</div>
        <div>{formatDuration(value[1] - value[0])}</div>
        <div>{formatDate(value[1])}</div>
      </div>

      {/* Slider Bar (40px high) */}
      <div style={{ position: 'absolute', bottom: '0px', left: 0, right: 0 }}>
        <Range
          min={min}
          max={max}
          value={value}
          onChange={onRangeChange}
          marks={{}} // no internal marks; external labels are used
          tipFormatter={(val) => formatDate(val)}
          railStyle={{
            backgroundColor: '#ccc',
            height: '40px',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
          trackStyle={[
            {
              backgroundColor: '#444',
              height: '40px',
              position: 'absolute',
              bottom: 0,
              left: 0,
            },
          ]}
          handleStyle={[
            {
              width: '12px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: '#fff',
              border: '1px solid #444',
              position: 'absolute',
              top: '-9px',
              cursor: 'pointer',
            },
            {
              width: '12px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: '#fff',
              border: '1px solid #444',
              position: 'absolute',
              top: '-9px',
              cursor: 'pointer',
            },
          ]}
        />
      </div>
    </div>
  );
}

export default TimeRangeSlider;
