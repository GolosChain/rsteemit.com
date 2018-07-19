import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Map } from 'immutable';

import tt from 'counterpart';
import { blockedUsers, blockedUsersContent } from 'app/utils/IllegalContent';

import transaction from 'app/redux/Transaction';

import LoadingIndicator from 'app/components/elements/LoadingIndicator';

import Container from 'src/app/components/common/Container';
import UserHeader from 'src/app/components/userProfile/common/UserHeader';
import UserNavigation from 'src/app/components/userProfile/common/UserNavigation';
import UserCardAbout from 'src/app/components/userProfile/common/UserCardAbout';

const Main = styled.div`
    background-color: #f9f9f9;
    padding: 20px 0;
`;

const SidebarLeft = styled.div`
    width: 273px;
    flex-shrink: 0;
`;

const Content = styled.div`
    display: flex;
    flex-shrink: 1;
    flex-grow: 1;
    justify-content: center;
    margin: 0 18px;

    &:first-child {
        margin-left: 0;
    }

    &:last-child {
        margin-right: 0;
    }
`;

const SidebarRight = styled.div`
    width: 273px;
    flex-shrink: 0;
`;

export default class UserProfileContainer extends Component {
    static propTypes = {};

    render() {
        const {
            currentUser,
            currentAccount,

            fetching,
            isOwner,

            followerCount,
            followingCount,

            uploadImage,
            updateAccount,
            notify,
        } = this.props;

        if (fetching) {
            return (
                <div className="UserProfile loader">
                    <div className="UserProfile__center">
                        <LoadingIndicator type="circle" width="40px" height="40px" />
                    </div>
                </div>
            );
        }

        if (!currentAccount) {
            return (
                <div className="UserProfile">
                    <div className="UserProfile__center">{tt('user_profile.unknown_account')}</div>
                </div>
            );
        }

        if (blockedUsers.includes(currentAccount.get('name'))) {
            return <IllegalContentMessage />;
        }

        if (blockedUsersContent.includes(currentAccount.get('name'))) {
            return <div>{tt('g.blocked_user_content')}</div>;
        }

        return (
            <Fragment>
                <UserHeader
                    currentUser={currentUser}
                    currentAccount={currentAccount}
                    uploadImage={uploadImage}
                    updateAccount={updateAccount}
                    notify={notify}
                />
                <UserNavigation accountName={currentAccount.get('name')} isOwner={isOwner} />
                <Main>
                    <Container align="flex-start" justify="center" small>
                        {this.props.routes.slice(-1)[0].path !== 'settings' && (
                            <SidebarLeft>
                                <UserCardAbout
                                    account={currentAccount}
                                    followerCount={followerCount}
                                    followingCount={followingCount}
                                />
                            </SidebarLeft>
                        )}
                        <Content>{this.props.content}</Content>
                        {this.props.sidebarRight && (
                            <SidebarRight>{this.props.sidebarRight}</SidebarRight>
                        )}
                    </Container>
                </Main>
            </Fragment>
        );
    }
}

module.exports = {
    path: '@:accountName',
    indexRoute: {
        onEnter: ({ params: { accountName } }, replace) => replace(`/@${accountName}/blog`),
    },
    childRoutes: [
        {
            path: 'blog',
            getComponents(nextState, cb) {
                cb(null, {
                    content: require('./blog/BlogContent').default,
                });
            },
        },
        {
            path: 'comments',
            getComponents(nextState, cb) {
                cb(null, { content: require('./comments/CommentsContent').default });
            },
        },
        {
            path: 'recent-replies',
            getComponents(nextState, cb) {
                cb(null, { content: require('./replies/RepliesContent').default });
            },
        },
        {
            path: 'settings',
            getComponents(nextState, cb) {
                cb(null, {
                    content: require('./settings/SettingsContent').default,
                });
            },
        },
        {
            path: 'activity',
            getComponents(nextState, cb) {
                cb(null, {
                    content: require('./activity/ActivityContent').default,
                    sidebarRight: require('./activity/ActivitySidebar').default,
                });
            },
        },
    ],
    component: connect(
        (state, ownProps) => {
            const route = ownProps.routes.slice(-1)[0].path;
            const accountName = ownProps.params.accountName.toLowerCase();

            const currentUser = state.user.get('current') || Map();
            const currentAccount = state.global.getIn(['accounts', accountName]);

            const fetching =
                state.global.getIn(['status', route, 'by_author'], {}).fetching ||
                state.app.get('loading');
            const isOwner = currentUser.get('username') === accountName;

            const followerCount = state.global.getIn(
                ['follow_count', accountName, 'follower_count'],
                0
            );

            const followingCount = state.global.getIn(
                ['follow_count', accountName, 'following_count'],
                0
            );

            return {
                currentUser,
                currentAccount,

                fetching,
                isOwner,

                followerCount,
                followingCount,
            };
        },
        dispatch => ({
            uploadImage: (file, progress) => {
                dispatch({
                    type: 'user/UPLOAD_IMAGE',
                    payload: { file, progress },
                });
            },
            updateAccount: ({ successCallback, errorCallback, ...operation }) => {
                dispatch(
                    transaction.actions.broadcastOperation({
                        type: 'account_metadata',
                        operation,
                        successCallback() {
                            dispatch(user.actions.getAccount());
                            successCallback();
                        },
                        errorCallback,
                    })
                );
            },
            notify: (message, dismiss = 3000) => {
                dispatch({
                    type: 'ADD_NOTIFICATION',
                    payload: {
                        key: 'settings_' + Date.now(),
                        message,
                        dismissAfter: dismiss,
                    },
                });
            },
        })
    )(UserProfileContainer),
};
