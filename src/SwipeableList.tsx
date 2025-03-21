import React from "react";

import "./SwipeableList.css";

interface SwipeableItemProps {
  scrollStartThreshold?: number;
  swipeStartThreshold?: number;
  threshold?: number;
}

interface SwipeableListProps {
  children:
    | React.ReactElement<SwipeableItemProps>[]
    | ((
        props: SwipeableItemProps & {
          className: string;
        },
      ) => React.ReactElement);
  scrollStartThreshold?: number;
  swipeStartThreshold?: number;
  threshold?: number;
}

const SwipeableList = ({
  children,
  scrollStartThreshold,
  swipeStartThreshold,
  threshold,
}: SwipeableListProps) =>
  typeof children === "function" ? (
    children({
      className: "swipeable-list",
      scrollStartThreshold,
      swipeStartThreshold,
      threshold,
    })
  ) : (
    <div className="swipeable-list">
      {React.Children.map(
        children,
        (child) =>
          React.isValidElement(child) &&
          React.cloneElement(child, {
            scrollStartThreshold,
            swipeStartThreshold,
            threshold,
          }),
      )}
    </div>
  );

export default SwipeableList;
