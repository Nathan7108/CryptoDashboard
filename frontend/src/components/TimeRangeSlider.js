import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const Range = Slider.Range;

const TimeRangeSlider = ({ min, max, value, onRangeChange }) => {
  return (
    <div style={{ margin: '20px' }}>
      <Range 
        min={min} 
        max={max} 
        value={value} 
        onChange={onRangeChange}
        tipFormatter={(val) => new Date(val).toLocaleString()} 
      />
    </div>
  );
};

export default TimeRangeSlider;
