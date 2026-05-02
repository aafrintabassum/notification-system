import React from "react";

function FilterBar({ activeFilter, onFilterChange }) {
  return (
    <div>
      <button onClick={() => onFilterChange(null)}>All</button>
      <button onClick={() => onFilterChange("email")}>Email</button>
      <button onClick={() => onFilterChange("sms")}>SMS</button>
      <button onClick={() => onFilterChange("push")}>Push</button>
    </div>
  );
}

export default FilterBar;