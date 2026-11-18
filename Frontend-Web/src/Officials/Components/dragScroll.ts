import React from 'react';

/**
 * Enables smooth mouse click-and-drag horizontal scrolling for tables and overflow containers.
 * Allows users to grab and drag left/right without interfering with inputs, buttons, or links.
 */
export const handleTableDragScroll = (e: React.MouseEvent<HTMLDivElement>): void => {
  if (e.button !== 0) return; // Only trigger for main (left) mouse click

  const target = e.target as HTMLElement;

  // Don't drag if interacting with form inputs, buttons, dropdowns, links, or editable elements
  if (
    ['INPUT', 'BUTTON', 'SELECT', 'A', 'TEXTAREA'].includes(target.tagName) ||
    target.closest('button') ||
    target.closest('a') ||
    target.closest('input') ||
    target.closest('select') ||
    target.closest('textarea') ||
    target.isContentEditable ||
    target.getAttribute('role') === 'button'
  ) {
    return;
  }

  // Also skip if the clicked element has an explicit pointer cursor (e.g., athlete profile links)
  try {
    const computedCursor = window.getComputedStyle(target).cursor;
    if (computedCursor === 'pointer') {
      return;
    }
  } catch { }

  const slider = e.currentTarget;
  if (!slider) return;

  let isDown = true;
  let hasMoved = false;
  const startX = e.clientX;
  const startScrollLeft = slider.scrollLeft;

  slider.style.cursor = 'grabbing';
  slider.style.userSelect = 'none';

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isDown) return;
    const deltaX = moveEvent.clientX - startX;
    if (Math.abs(deltaX) > 4) {
      hasMoved = true;
      moveEvent.preventDefault();
    }
    slider.scrollLeft = startScrollLeft - deltaX;
  };

  const onMouseUp = () => {
    isDown = false;
    slider.style.cursor = 'grab';
    slider.style.removeProperty('user-select');
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    // If dragged significantly, suppress the trailing click event
    if (hasMoved) {
      const captureClick = (clickEvt: MouseEvent) => {
        clickEvt.stopPropagation();
        clickEvt.preventDefault();
        window.removeEventListener('click', captureClick, true);
      };
      window.addEventListener('click', captureClick, true);
      setTimeout(() => {
        window.removeEventListener('click', captureClick, true);
      }, 50);
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

