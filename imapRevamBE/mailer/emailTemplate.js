const React = require('react');
const { Html, Body, Section, Img } = require('@react-email/components');
const flowImages = require('./statusFlow');

const EmailTemplate = ({ data }) => {
  const firstStatus = data.radio.remainingStatus[0]?.statusName;
  const currentStatus = data.radio.status;
  const imageKey = `${firstStatus}|${currentStatus}`;
  const imageSrc = flowImages[imageKey];

  return React.createElement(
    Html,
    null,
    React.createElement(
      Body,
      null,
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              width: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            },
          },
          imageSrc
            ? React.createElement(Img, {
                src: imageSrc,
                alt: `Flow: ${firstStatus}, current: ${currentStatus}`,
                width: '100%', // width as percentage
                height: 'auto', // maintain aspect ratio
              })
            : React.createElement('p', null, 'No image available for this flow')
        )
      )
    )
  );
};

module.exports = EmailTemplate;
