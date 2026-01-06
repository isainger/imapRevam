const DepartmentCard = ({ title, active, onClick }) => {
  const initials =
    title.split(" ").length === 1
      ? title.slice(0, 2).toUpperCase()
      : title
          .split(" ")
          .map(word => word[0])
          .join("")
          .toUpperCase();

  return (
     <div className="flex flex-col items-center gap-4">
    <div className={`card ${active ? "active" : ""}`} onClick={onClick}>
      <div className="border"></div>
       {active && (
          <div className="tick-overlay">
            <div className="tick-circle">
              ✓
            </div>
          </div>
        )}
      <div className="content">
        <div className="logo">
          <div className="logo1">{initials}</div>
          <div className="logo2">{title}</div>
          <span className="trail"></span>
        </div>
      </div>

      <span className="bottom-text">Department</span>
    </div>
    <p className="text-md font-semibold text-slate-700 text-center">
        {title}
      </p>
    </div>
  );
};

export default DepartmentCard;
