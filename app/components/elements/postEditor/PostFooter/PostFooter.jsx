import React, { PureComponent, createRef } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import tt from 'counterpart';
import styled from 'styled-components';
import is from 'styled-is';

import TagInput from 'app/components/elements/postEditor/TagInput';
import TagsEditLine from 'app/components/elements/postEditor/TagsEditLine';
import PostOptions from 'app/components/elements/postEditor/PostOptions/PostOptions';
import Button from 'app/components/elements/common/Button';
import Hint from 'app/components/elements/common/Hint';
import { NSFW_TAG } from 'app/utils/tags';
import './PostFooter.scss';

const Wrapper = styled.div`
    display: flex;
    align-items: center;
    height: 80px;

    ${is('isEdit')`
        margin-bottom: 50px;
    `};
`;

const Tags = styled.div`
    flex-grow: 1;
    height: 100%;
    display: flex;
    align-items: center;
`;

const Buttons = styled.div`
    display: flex;
    flex-shrink: 0;

    @media (max-width: 576px) {
        order: -1;
    }
`;

const StyledButton = styled(Button)`
    position: relative;
    flex-shrink: 0;
    margin-right: 15px !important;

    &:last-child {
        margin-right: 0;
    }
`;

const DisabledHint = styled(Hint)`
    opacity: 0;
    transition: opacity 0.25s;
`;

export default class PostFooter extends PureComponent {
    static propTypes = {
        editMode: PropTypes.bool,
        tags: PropTypes.array,
        postDisabled: PropTypes.bool,
        disabledHint: PropTypes.string,
        onPayoutTypeChange: PropTypes.func.isRequired,
        onTagsChange: PropTypes.func.isRequired,
        onPostClick: PropTypes.func.isRequired,
        onResetClick: PropTypes.func.isRequired,
        onCancelClick: PropTypes.func.isRequired,
    };

    state = {
        temporaryErrorText: null,
        singleLine: true,
    };

    root = createRef();

    componentDidMount() {
        this._checkSingleLine();

        this._resizeInterval = setInterval(() => {
            this._checkSingleLine();
        }, 1000);
    }

    componentWillUnmount() {
        clearInterval(this._resizeInterval);
        clearTimeout(this._temporaryErrorTimeout);
    }

    render() {
        const { editMode, tags, postDisabled, disabledHint, onTagsChange } = this.props;
        const { temporaryErrorText, singleLine } = this.state;

        return (
            <Wrapper innerRef={this.root} isEdit={editMode}>
                <Tags>
                    <TagInput tags={tags} onChange={onTagsChange} />
                    {singleLine ? (
                        <TagsEditLine
                            tags={tags}
                            inline
                            editMode={editMode}
                            className="PostFooter__inline-tags-line"
                            hidePopular={editMode}
                            onChange={this.props.onTagsChange}
                        />
                    ) : null}
                </Tags>
                <PostOptions
                    nsfw={this.props.tags.includes(NSFW_TAG)}
                    onNsfwClick={this._onNsfwClick}
                    payoutType={this.props.payoutType}
                    editMode={editMode}
                    onPayoutChange={this.props.onPayoutTypeChange}
                />
                <Buttons>
                    {editMode ? (
                        <StyledButton onClick={this.props.onCancelClick}>
                            {tt('g.cancel')}
                        </StyledButton>
                    ) : (
                        <StyledButton onClick={this.props.onResetClick}>
                            {tt('g.clear')}
                        </StyledButton>
                    )}
                    {postDisabled && disabledHint ? (
                        <Hint key="1" warning align="right" className="PostFooter__disabled-hint">
                            {disabledHint}
                        </Hint>
                    ) : temporaryErrorText ? (
                        <Hint key="2" error align="right">
                            {temporaryErrorText}
                        </Hint>
                    ) : null}
                    <StyledButton primary disabled={postDisabled} onClick={this.props.onPostClick}>
                        {editMode ? tt('post_editor.update') : tt('g.post')}
                    </StyledButton>
                </Buttons>
                {singleLine ? null : (
                    <TagsEditLine
                        className="PostFooter__tags-line"
                        editMode={editMode}
                        tags={tags}
                        hidePopular={editMode}
                        onChange={onTagsChange}
                    />
                )}
            </Wrapper>
        );
    }

    showPostError(errorText) {
        clearTimeout(this._temporaryErrorTimeout);

        this.setState({
            temporaryErrorText: errorText,
        });

        this._temporaryErrorTimeout = setTimeout(() => {
            this.setState({
                temporaryErrorText: null,
            });
        }, 5000);
    }

    _checkSingleLine() {
        const singleLine = this.root.current.clientWidth > 950;

        if (this.state.singleLine !== singleLine) {
            this.setState({ singleLine });
        }
    }

    _onNsfwClick = () => {
        const tags = this.props.tags;
        let newTags;

        if (tags.includes(NSFW_TAG)) {
            newTags = tags.filter(t => t !== NSFW_TAG);
        } else {
            newTags = tags.concat(NSFW_TAG);
        }

        this.props.onTagsChange(newTags);
    };
}
