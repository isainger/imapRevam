const ActionBtn = ({ btnText, onClick, type }) => {
  return (
    <button className="Btn" onClick={onClick} type={type}>
        <span>{btnText}</span>
    </button>
  );
};

export default ActionBtn;
