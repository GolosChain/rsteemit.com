import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Map } from 'immutable';
import styled from 'styled-components';
import is from 'styled-is';
import tt from 'counterpart';

import VotePanel from '../../common/VotePanel';
import ReplyBlock from '../../common/ReplyBlock';

const Wrapper = styled.div`
    position: relative;
    display: flex;
    flex-shrink: 0;
    justify-content: space-between;
    align-items: center;
    z-index: 1;
    pointer-events: none;

    & > * {
        pointer-events: initial;
    }

    @media (min-width: 890px) and (max-width: 1087px), (max-width: 639px) {
        flex-direction: column;
    }
`;

const CommentVotePanel = styled(VotePanel)`
    width: 257px;

    @media (min-width: 890px) and (max-width: 1087px), (max-width: 639px) {
        width: 100%;
        justify-content: space-between;
    }
`;

const CommentReplyBlock = styled(ReplyBlock)`
    margin: 0;

    @media (min-width: 890px) and (max-width: 1087px), (max-width: 639px) {
        flex-grow: 1;
        justify-content: center;
    }
`;

const CommentReplyWrapper = styled.div`
    display: flex;
    align-items: center;

    @media (min-width: 890px) and (max-width: 1087px), (max-width: 639px) {
        width: 100%;
        justify-content: center;
    }
`;

const Splitter = styled.div`
    flex-shrink: 0;
    width: 1px;
    height: 26px;
    margin: 0 6px;
    background: #e1e1e1;
`;

const FooterConfirm = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: 50px;
`;

const ButtonConfirm = styled.div`
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 10px;
    font-family: 'Open Sans', sans-serif;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
    color: #b7b7ba;
    cursor: pointer;

    ${is('main')`
        color: #2879ff !important;
    `};

    &:hover {
        color: #393636;
    }

    &:last-child {
        padding-right: 18px;
    }
`;

export default class CommentFooter extends Component {
    static propTypes = {
        commentRef: PropTypes.object,
        contentLink: PropTypes.string,
        comment: PropTypes.instanceOf(Map),
        edit: PropTypes.bool.isRequired,
        isOwner: PropTypes.bool.isRequired,
        onReplyClick: PropTypes.func.isRequired,
        onVote: PropTypes.func.isRequired,
        replyRef: PropTypes.object.isRequired,
        showReply: PropTypes.bool.isRequired,
        username: PropTypes.string,
    };

    onCancelReplyClick = () => {
        const { replyRef } = this.props;
        replyRef.current.cancel();
    };

    onPostReplyClick = () => {
        const { replyRef } = this.props;
        replyRef.current.post();
    };

    onCancelEditClick = () => {
        const { commentRef } = this.props;
        commentRef.current.cancel();
    };

    onSaveEditClick = () => {
        const { commentRef } = this.props;
        commentRef.current.post();
    };

    render() {
        const { comment, contentLink, isOwner, showReply, edit, onReplyClick } = this.props;

        if (showReply) {
            return (
                <FooterConfirm>
                    <ButtonConfirm onClick={this.onCancelReplyClick}>
                        {tt('g.cancel')}
                    </ButtonConfirm>
                    <Splitter />
                    <ButtonConfirm main onClick={this.onPostReplyClick}>
                        {tt('g.publish')}
                    </ButtonConfirm>
                </FooterConfirm>
            );
        } else if (edit) {
            return (
                <FooterConfirm>
                    <ButtonConfirm onClick={this.onCancelEditClick}>{tt('g.cancel')}</ButtonConfirm>
                    <Splitter />
                    <ButtonConfirm main onClick={this.onSaveEditClick}>
                        {tt('g.save')}
                    </ButtonConfirm>
                </FooterConfirm>
            );
        }

        return (
            <Wrapper>
                <CommentVotePanel
                    contentLink={`${comment.get('author')}/${comment.get('permlink')}`}
                />
                <CommentReplyWrapper>
                    <CommentReplyBlock
                        count={comment.get('children')}
                        link={contentLink}
                        text={tt('g.reply')}
                        notOwner={!isOwner}
                        onReplyClick={onReplyClick}
                    />
                </CommentReplyWrapper>
            </Wrapper>
        );
    }
}
