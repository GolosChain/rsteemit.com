import React, { Component } from 'react';
import { connect } from 'react-redux';
import cookie from 'react-cookie';

import transaction from 'app/redux/Transaction';
import user from 'app/redux/User';
import g from 'app/redux/GlobalReducer';

import tt from 'counterpart';
import o2j from 'shared/clash/object2json';
import reactForm from 'app/utils/ReactForm';

import {
    CURRENCIES,
    DEFAULT_CURRENCY,
    CURRENCY_COOKIE_KEY,
    LANGUAGES,
    DEFAULT_LANGUAGE,
    LOCALE_COOKIE_KEY,
    THEMES,
    DEFAULT_THEME,
    USER_GENDER,
    FRACTION_DIGITS,
    FRACTION_DIGITS_MARKET,
    MIN_VESTING_SHARES,
} from 'app/client_config';

import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import UserList from 'app/components/elements/UserList';
import Dialog from 'golos-ui/Dialog';

class SettingsContainer extends Component {
    constructor(props) {
        super();
        this.initForm(props);
    }

    state = {
        errorMessage: '',
        successMessage: '',
    };

    initForm(props) {
        reactForm({
            instance: this,
            name: 'accountSettings',
            fields: [
                'name',
                'gender',
                'about',
                'location',
                'website',
            ],
            initialValues: props.profile,
            validation: values => ({
                name:
                    values.name && values.name.length > 20
                        ? tt('settings_jsx.name_is_too_long')
                        : values.name && /^\s*@/.test(values.name)
                            ? tt('settings_jsx.name_must_not_begin_with')
                            : null,
                gender:
                    values.gender && values.gender.length > 20
                        ? tt('settings_jsx.name_is_too_long')
                        : values.gender && /^\s*@/.test(values.gender)
                            ? tt('settings_jsx.name_must_not_begin_with')
                            : null,
                about:
                    values.about && values.about.length > 160
                        ? tt('settings_jsx.about_is_too_long')
                        : null,
                location:
                    values.location && values.location.length > 30
                        ? tt('settings_jsx.location_is_too_long')
                        : null,
                website:
                    values.website && values.website.length > 100
                        ? tt('settings_jsx.website_url_is_too_long')
                        : values.website && !/^https?:\/\//.test(values.website)
                            ? tt('settings_jsx.invalid_url')
                            : null,
            }),
        });
        this.handleSubmitForm = this.state.accountSettings.handleSubmit(args =>
            this.handleSubmit(args)
        );
    }

    componentWillMount() {
        const { accountName } = this.props;
        const { vesting_shares } = this.props.account;

        let rounding, nsfwPref;

        nsfwPref =
            (process.env.BROWSER
                ? localStorage.getItem('nsfwPref-' + accountName)
                : null) || 'warn';
        this.setState({ nsfwPref, oldNsfwPref: nsfwPref });

        if (process.env.BROWSER) {
            rounding = localStorage.getItem('xchange.rounding');
            if (!rounding) {
                if (vesting_shares > MIN_VESTING_SHARES)
                    rounding = FRACTION_DIGITS;
                else rounding = FRACTION_DIGITS_MARKET;
            }
            this.setState({ rounding: rounding });
        }
    }

    onNsfwPrefChange = (e) => {
        const nsfwPref = e.currentTarget.value;
        this.setState({ nsfwPref: nsfwPref });
    }

    onNsfwPrefSubmit = (e) => {
        const { accountName } = this.props;
        const { nsfwPref } = this.state;
        localStorage.setItem('nsfwPref-' + accountName, nsfwPref);
        this.setState({ oldNsfwPref: nsfwPref });
    }

    notify = () => {
        this.props.notify(tt('g.saved'));
    };

    onCurrencyChange = event => {
        localStorage.setItem('xchange.created', 0);
        localStorage.setItem('xchange.picked', event.target.value);
        this.props.reloadExchangeRates();
        this.notify();
    };

    onRoundingNumbersChange = event => {
        localStorage.setItem('xchange.rounding', event.target.value);
        this.setState({ rounding: event.target.value });
        this.notify();
    };

    onLanguageChange = event => {
        const language = event.target.value;
        cookie.save(LOCALE_COOKIE_KEY, language, {
            path: '/',
            expires: new Date(Date.now() + 60 * 60 * 24 * 365 * 10 * 1000),
        });
        localStorage.setItem('language', language);
        this.props.changeLanguage(language);
        this.notify();
    };

    onThemeChange = event => {
        const theme = event.target.value;
        localStorage.setItem('theme', theme);
        this.props.changeTheme(theme);
        this.notify();
    };

    handleSubmit = ({ updateInitialValues }) => {
        let { metaData } = this.props;
        if (!metaData) metaData = {};

        //fix https://github.com/GolosChain/tolstoy/issues/450
        if (
            typeof metaData === 'string' &&
            metaData.localeCompare("{created_at: 'GENESIS'}") == 0
        ) {
            metaData = {};
            metaData.created_at = 'GENESIS';
        }

        const {
            name,
            gender,
            about,
            location,
            website,
        } = this.state;

        // Update relevant fields
        metaData.profile.name = name.value;
        metaData.profile.gender = gender.value;
        metaData.profile.about = about.value;
        metaData.profile.location = location.value;
        metaData.profile.website = website.value;

        // Remove empty keys
        if (!metaData.profile.name) delete metaData.profile.name;
        if (!metaData.profile.gender) delete metaData.profile.gender;
        if (!metaData.profile.about) delete metaData.profile.about;
        if (!metaData.profile.location) delete metaData.profile.location;
        if (!metaData.profile.website) delete metaData.profile.website;

        const { account, updateAccount } = this.props;
        this.setState({ loading: true });
        updateAccount({
            json_metadata: JSON.stringify(metaData),
            account: account.name,
            memo_key: account.memo_key,
            errorCallback: e => {
                if (e === 'Canceled') {
                    this.setState({
                        loading: false,
                        errorMessage: '',
                    });
                } else {
                    console.log('updateAccount ERROR', e);
                    this.setState({
                        loading: false,
                        changed: false,
                        errorMessage: tt('g.server_returned_error'),
                    });
                }
            },
            successCallback: () => {
                this.setState({
                    loading: false,
                    changed: false,
                    errorMessage: '',
                    successMessage: tt('g.saved') + '!',
                });
                // remove successMessage after a while
                setTimeout(() => this.setState({ successMessage: '' }), 4000);
                updateInitialValues();
            },
        });
    };

    render() {
        // const { state, props } = this;

        // const { submitting, valid, touched } = this.state.accountSettings;
        // const disabled =
        //     !props.isOwnAccount ||
        //     state.loading ||
        //     submitting ||
        //     !valid ||
        //     !touched;

        // const {
        //     name,
        //     about,
        //     gender,
        //     location,
        //     website,
        //     rounding,
        // } = this.state;

        // const { follow, account, isOwnAccount } = this.props;
        // const following =
        //     follow && follow.getIn(['getFollowingAsync', account.name]);
        // const ignores =
        //     isOwnAccount && following && following.get('ignore_result');

        // const languageSelectBox = (
        //     <select
        //         defaultValue={
        //             process.env.BROWSER
        //                 ? cookie.load(LOCALE_COOKIE_KEY)
        //                 : DEFAULT_LANGUAGE
        //         }
        //         onChange={this.onLanguageChange}
        //     >
        //         {Object.keys(LANGUAGES).map(key => {
        //             return (
        //                 <option key={key} value={key}>
        //                     {LANGUAGES[key]}
        //                 </option>
        //             );
        //         })}
        //     </select>
        // );

        // const themeSelectBox = (
        //     <select
        //         defaultValue={
        //             process.env.BROWSER
        //                 ? localStorage.getItem('theme')
        //                 : DEFAULT_THEME
        //         }
        //         onChange={this.onThemeChange}
        //     >
        //         {THEMES.map(i => {
        //             return (
        //                 <option key={i} value={i}>
        //                     {i}
        //                 </option>
        //             );
        //         })}
        //     </select>
        // );

        // return (
        //     <div className="Settings">
        //         <div className="row">
        //             <form
        //                 onSubmit={this.handleSubmitForm}
        //                 className="small-12 medium-8 large-6 columns"
        //             >
        //                 <h3>{tt('settings_jsx.public_profile_settings')}</h3>
        //                 <label>
        //                     {tt('settings_jsx.choose_language')}
        //                     {languageSelectBox}
        //                 </label>
        //                 <div className="error" />
        //                 <label>
        //                     {tt('settings_jsx.choose_currency')}
        //                     <select
        //                         defaultValue={
        //                             process.env.BROWSER
        //                                 ? localStorage.getItem('xchange.picked')
        //                                 : DEFAULT_CURRENCY
        //                         }
        //                         onChange={this.onCurrencyChange}
        //                     >
        //                         {CURRENCIES.map(i => {
        //                             return (
        //                                 <option key={i} value={i}>
        //                                     {i}
        //                                 </option>
        //                             );
        //                         })}
        //                     </select>
        //                 </label>
        //                 <label>
        //                     {tt('settings_jsx.rounding_numbers.info_message')}
        //                     <select
        //                         defaultValue={
        //                             process.env.BROWSER
        //                                 ? rounding
        //                                 : FRACTION_DIGITS
        //                         }
        //                         onChange={this.onRoundingNumbersChange}
        //                     >
        //                         <option value="0">
        //                             {tt(
        //                                 'settings_jsx.rounding_numbers.integer'
        //                             )}
        //                         </option>
        //                         <option value="1">
        //                             {tt(
        //                                 'settings_jsx.rounding_numbers.one_decimal'
        //                             )}
        //                         </option>
        //                         <option value="2">
        //                             {tt(
        //                                 'settings_jsx.rounding_numbers.two_decimal'
        //                             )}
        //                         </option>
        //                         <option value="3">
        //                             {tt(
        //                                 'settings_jsx.rounding_numbers.three_decimal'
        //                             )}
        //                         </option>
        //                     </select>
        //                 </label>
        //                 <label>
        //                     {tt('settings_jsx.choose_theme')}
        //                     {themeSelectBox}
        //                 </label>
        //                 <div className="error" />
        //                 <label>
        //                     {tt('settings_jsx.profile_name')}
        //                     <input
        //                         type="text"
        //                         {...name.props}
        //                         maxLength="20"
        //                         autoComplete="off"
        //                     />
        //                 </label>
        //                 <div className="error">
        //                     {name.touched && name.error}
        //                 </div>
        //                 <label>
        //                     {tt('settings_jsx.profile_gender.title')}
        //                     <select {...gender.props}>
        //                         {USER_GENDER.map(i => {
        //                             return (
        //                                 <option key={i} value={i}>
        //                                     {tt(
        //                                         'settings_jsx.profile_gender.genders.' +
        //                                             i
        //                                     )}
        //                                 </option>
        //                             );
        //                         })}
        //                     </select>
        //                 </label>
        //                 <div className="error">
        //                     {gender.touched && gender.error}
        //                 </div>
        //                 <label>
        //                     {tt('settings_jsx.profile_about')}
        //                     <input
        //                         type="text"
        //                         {...about.props}
        //                         maxLength="160"
        //                         autoComplete="off"
        //                     />
        //                 </label>
        //                 <div className="error">
        //                     {about.touched && about.error}
        //                 </div>
        //                 <label>
        //                     {tt('settings_jsx.profile_location')}
        //                     <input
        //                         type="text"
        //                         {...location.props}
        //                         maxLength="30"
        //                         autoComplete="off"
        //                     />
        //                 </label>
        //                 <div className="error">
        //                     {location.touched && location.error}
        //                 </div>
        //                 <label>
        //                     {tt('settings_jsx.profile_website')}
        //                     <input
        //                         type="url"
        //                         {...website.props}
        //                         maxLength="100"
        //                         autoComplete="off"
        //                     />
        //                 </label>
        //                 <div className="error">
        //                     {website.blur && website.touched && website.error}
        //                 </div>
        //                 <br />
        //                 {state.loading && (
        //                     <span>
        //                         <LoadingIndicator type="circle" />
        //                         <br />
        //                     </span>
        //                 )}
        //                 {!state.loading && (
        //                     <input
        //                         type="submit"
        //                         className="button"
        //                         value={tt('settings_jsx.update')}
        //                         disabled={disabled}
        //                     />
        //                 )}{' '}
        //                 {state.errorMessage ? (
        //                     <small className="error">
        //                         {state.errorMessage}
        //                     </small>
        //                 ) : state.successMessage ? (
        //                     <small className="success uppercase">
        //                         {state.successMessage}
        //                     </small>
        //                 ) : null}
        //             </form>
        //         </div>

        //         {isOwnAccount && (
        //             <div className="row">
        //                 <div className="small-12 medium-8 large-6 columns">
        //                     <br />
        //                     <br />
        //                     <h3>
        //                         {tt(
        //                             'settings_jsx.private_post_display_settings'
        //                         )}
        //                     </h3>
        //                     <div>
        //                         {tt(
        //                             'settings_jsx.not_safe_for_work_nsfw_content'
        //                         )}
        //                     </div>
        //                     <select
        //                         value={this.state.nsfwPref}
        //                         onChange={this.onNsfwPrefChange}
        //                     >
        //                         <option value="hide">
        //                             {tt('settings_jsx.always_hide')}
        //                         </option>
        //                         <option value="warn">
        //                             {tt('settings_jsx.always_warn')}
        //                         </option>
        //                         <option value="show">
        //                             {tt('settings_jsx.always_show')}
        //                         </option>
        //                     </select>
        //                     <br />
        //                     <br />
        //                     <input
        //                         type="submit"
        //                         onClick={this.onNsfwPrefSubmit}
        //                         className="button"
        //                         value={tt('settings_jsx.update')}
        //                         disabled={
        //                             this.state.nsfwPref ==
        //                             this.state.oldNsfwPref
        //                         }
        //                     />
        //                 </div>
        //             </div>
        //         )}
        //         {ignores &&
        //             ignores.size > 0 && (
        //                 <div className="row">
        //                     <div className="small-12 columns">
        //                         <br />
        //                         <br />
        //                         <UserList
        //                             title={tt('settings_jsx.muted_users')}
        //                             account={account}
        //                             users={ignores}
        //                         />
        //                     </div>
        //                 </div>
        //             )}
        //     </div>
        // );


        return <Dialog/>;
    }
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const { accountName } = ownProps.routeParams;
        const account = state.global.getIn(['accounts', accountName]).toJS();
        const current_user = state.user.get('current');
        const username = current_user ? current_user.get('username') : '';
        let metaData = account
            ? o2j.ifStringParseJSON(account.json_metadata)
            : {};
        if (typeof metaData === 'string')
            metaData = o2j.ifStringParseJSON(metaData); // issue #1237
        const profile = metaData && metaData.profile ? metaData.profile : {};

        return {
            account,
            metaData,
            accountName,
            isOwnAccount: username == accountName,
            profile,
            follow: state.global.get('follow'),
            ...ownProps,
        };
    },
    // mapDispatchToProps
    dispatch => ({
        changeLanguage: language => {
            dispatch(user.actions.changeLanguage(language));
        },
        reloadExchangeRates: () => {
            dispatch(g.actions.fetchExchangeRates());
        },
        changeTheme: theme => {
            dispatch(user.actions.changeTheme(theme));
        },
        updateAccount: ({ successCallback, errorCallback, ...operation }) => {
            const success = () => {
                dispatch(user.actions.getAccount());
                successCallback();
            };

            const options = {
                type: 'account_metadata',
                operation,
                successCallback: success,
                errorCallback,
            };
            dispatch(transaction.actions.broadcastOperation(options));
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
)(SettingsContainer);
