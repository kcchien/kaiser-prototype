import React, { Component } from 'react';
import shouldPureComponentUpdate from './shouldPureComponentUpdate';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import * as State from '../../data/State';
import ItemTypes from '../../data/ItemTypes';
import './Card.css'
import * as CardIcon from '../../utils/CardIcon';

class Card extends Component {

  componentDidMount() {
    this.props.connectDragPreview(getEmptyImage(), {
      captureDraggingState: false
    });
  }

  shouldComponentUpdate = shouldPureComponentUpdate;

  render() {
    const {
      columnIsActive,
      connectDragSource,
      connectDropTarget,
      isDragging,
      card: {
        title,
        editMode,
        todos,
        bugs,
        comments,
        assignees
      }
    } = this.props;
    const opacity = isDragging ? 0 : (columnIsActive?0.4:1);

    return connectDragSource(connectDropTarget(
      <div className="Card" style={{opacity, position:'relative'}}>
        {
          editMode
          ?
          <div className="title">
            <input className="cardTitleInput" ref="titleInput" defaultValue={title} onKeyUp={(e) => { if(e.keyCode === 13) {this.setCardTitle()} else if(e.keyCode===27){this.setCardEditMode(false)}}} autoFocus={true} placeholder="Enter card title"/>
          </div>
          :
          <div className="title" onClick={this.handleCardTitleClicked.bind(this)}>
            {this.renderCardTitle()}
          </div>
        }
        <div style={{paddingLeft:'10px', fontSize:'12px', color:'gray', position:'relative', top:'4px'}}>
          {this.renderTodosBadge(todos)}
          {this.renderBugsBadge(bugs)}
          {this.renderCommentsBadge(comments)}
        </div>
        {this.renderAssignees(assignees)}
      </div>
    ));
  }

  renderCardTitle() {
    const cardTypeIcon = CardIcon.getCardTypeIcon(this.props.card.type);
    const cardTypeIconClassName = CardIcon.getCardTypeIconClassName(this.props.card.type);
    return (
      <span style={{fontSize:'14px'}}>
        <i className={ cardTypeIconClassName + " fa " + cardTypeIcon}></i> <span className="inner-title">{this.props.card.title}</span> <span style={{color:'#c5c5c5'}}>{`#${this.props.card.id}`}</span>
      </span>
    )
  }

  renderTodosBadge(todos) {
    if(todos) {
      const numTodos = todos.length;
      if(numTodos > 0) {
        const numDoneTodos = todos.filter((t) => t.done === true).length;
        return (
          <span className={"badge" + (numDoneTodos === numTodos? ' complete':'')} title={numDoneTodos + " of " + numTodos + " todos done"}>
            <i className="fa fa-check-square-o"></i> {numDoneTodos}/{numTodos}
            </span>
          );
        }
      }
    }

    renderBugsBadge(bugs) {
      if(bugs) {
        const numBugs = bugs.length;
        if(numBugs > 0) {
          const numDoneBugs = bugs.filter((b) => b.done === true).length;
          return (
            <span className={"badge" + (numDoneBugs === numBugs ? ' complete':'')} title={numDoneBugs + " of " + numBugs + " bugs done"}>
              <i className="fa fa-bug"></i> {numDoneBugs}/{numBugs}
              </span>
            );
          }
        }
      }

      renderCommentsBadge(comments) {
        if(comments) {
          const numComments = comments.length;
          if(numComments > 0) {
            return (
              <span className="badge" title={numComments + " comment" + (numComments > 1 ? 's':'')}>
                <i style={{top:'0px'}} className="card-comments-icon fa fa-comments-o"></i>
                <span style={{marginLeft:'2px'}}>{numComments}</span>
              </span>
            );
          }
        }
      }

      renderAssignees(assignees) {
        if(assignees) {
          return (
            <div style={{position:'absolute', bottom:'0px', right:'5px'}}>
              {assignees.map( (a) => {
                let member = State.findMember(a.username);
                if(member) {
                  return (
                    <img key={a.username} className="card-assignee-image" src={member.imageUrl} alt={member.username} title={"Assigned to " + member.username}/>
                  );
                } else {
                  return null;
                }
              })}
            </div>
          );
        }
      }

      handleCardTitleClicked() {
        State.getReduxStore().dispatch({type: 'SHOW_CARD_PAGE', cardId:this.props.card.id, columnId:this.props.columnId});
      }

      setCardTitle() {
        const title = findDOMNode(this.refs.titleInput).value.trim();
        if(title && title.length > 0) {
          State.getReduxStore().dispatch({type: 'SET_CARD_TITLE', columnId:this.props.columnId, cardId:this.props.card.id, title, editMode:false});
        }
      }

      setCardEditMode(editMode) {
        State.getReduxStore().dispatch({type: 'SET_CARD_EDIT_MODE', columnId:this.props.columnId, cardId:this.props.card.id, editMode});
      }
    }

    const cardSource = {
      beginDrag(props) {
        return {
          id: props.card.id,
          title:props.card.title,
          type:props.card.type,
          index: props.index,
          columnIndex: props.columnIndex,
          columnId: props.columnId,
          todos:props.card.todos,
          bugs:props.card.bugs,
          comments:[],//props.card.comments,
          assignees:props.card.assignees
        };
      }
    };

    const cardTarget = {
      hover(props, monitor, component) {
        const dragIndex = monitor.getItem().index;
        const columnId = monitor.getItem().columnId;
        const hoverIndex = props.index;

        // Don't replace items with themselves
        if (dragIndex === hoverIndex) {
          return;
        }

        // Determine rectangle on screen
        const hoverBoundingRect = findDOMNode(component).getBoundingClientRect();

        // Get vertical middle
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

        // Determine mouse position
        const clientOffset = monitor.getClientOffset();

        // Get pixels to the top
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        // Only perform the move when the mouse has crossed half of the items height
        // When dragging downwards, only move when the cursor is below 50%
        // When dragging upwards, only move when the cursor is above 50%

        // Dragging downwards
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
          return;
        }

        // Dragging upwards
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
          return;
        }
        // Time to actually perform the action... as long as the card is within the same column.
        if(columnId === props.columnId) {
          State.getReduxStore().dispatch({type: 'REORDER_CARD', columnId, dragIndex, hoverIndex});
          // Note: we're mutating the monitor item here!
          // Generally it's better to avoid mutations,
          // but it's good here for the sake of performance
          // to avoid expensive index searches.
          monitor.getItem().index = hoverIndex;
        }
      }
    };

    function collectDropTarget(connect, monitor) {
      return {
        connectDropTarget:connect.dropTarget(),
        isOver: monitor.isOver()
      };
    }

    function collectDragSource(connect, monitor) {
      return {
        connectDragSource: connect.dragSource(),
        connectDragPreview: connect.dragPreview(),
        isDragging: monitor.isDragging()
      }
    }

    let DraggableCard = DragSource(ItemTypes.CARD, cardSource, collectDragSource)(Card);
    export default DropTarget(ItemTypes.CARD, cardTarget, collectDropTarget)(DraggableCard);
