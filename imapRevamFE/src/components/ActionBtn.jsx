const ActionBtn = ({ btnText, onClick, type, btnFont }) => {
  const getIcon = () => {
    switch (btnFont) {
      case "animated_images":
        return "fa-solid fa-envelope-open-text";
      case "save":
        return "fa-solid fa-paper-plane";
      default:
        return null;
    }
  };

  const icon = getIcon();

  return (
    <button className="action-btn" onClick={onClick} type={type}>
      <span className="action-btn-shimmer" />
      <span className="action-btn-content">
        {icon && <i className={`${icon} action-btn-icon`} />}
        <span>{btnText}</span>
      </span>
    </button>
  );
};

export default ActionBtn;