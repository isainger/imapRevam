import React, { useEffect } from 'react'

const EmailTemplateLayout = (props) => {
  const {data} = props
  return (
    <div className='flex justify-center items-center flex-col w-full h-full'>
       <div className='w-full h-fit flex justify-center items-center'>
         {
          data.radio.remainingStatus.map((item,index)=>(
            <div key={index} className={`${index===0 ?'clip-arrow-first': 'clip-arrow-right'} 
            flex items-center justify-center w-full py-4 font-extrabold`} style={{
              background:data.radio.status=== item.statusName ? item.color : 'linear-gradient(135deg, #dee2e6, #868e96)',
              color: data.radio.status=== item.statusName ? 'white' : 'gray',
            }}>
            <i className={item.icons}></i>
            <div>
              {item.statusName}
            </div></div>
          ))
         }
         
       </div>
    </div>
  )
}

export default EmailTemplateLayout
