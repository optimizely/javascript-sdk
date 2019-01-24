import React from 'react';

export default function example({ title='', children }) {
  return <div class="example">
    <h5 class="example-title">{title}</h5>
    <div class="example-body">
      {children}
    </div>
  </div>
}
