import {takeLatest, takeEvery} from 'redux-saga';
import {call, put, select, fork} from 'redux-saga/effects';
import {loadFollows, fetchFollowCount} from 'app/redux/FollowSaga';
import {getContent} from 'app/redux/SagaShared';
import GlobalReducer from './GlobalReducer';
import constants from './constants';
import {fromJS, Map} from 'immutable'
import { DEBT_TOKEN_SHORT, DEFAULT_CURRENCY, IGNORE_TAGS, PUBLIC_API, SELECT_TAGS_KEY } from 'app/client_config';
import cookie from "react-cookie";
import {api} from 'golos-js';

export const fetchDataWatches = [
    watchLocationChange,
    watchDataRequests,
    watchFetchJsonRequests,
    watchFetchState,
    watchGetContent,
    watchFetchExchangeRates
];

export function* watchGetContent() {
    yield* takeEvery('GET_CONTENT', getContentCaller);
}

export function* getContentCaller(action) {
    yield getContent(action.payload);
}

export function* watchLocationChange() {
    yield* takeLatest('@@router/LOCATION_CHANGE', fetchState);
}

export function* watchFetchState() {
    yield* takeLatest('FETCH_STATE', fetchState);
}

let is_initial_state = true;
export function* fetchState(location_change_action) {
    const {pathname} = location_change_action.payload;
    const m = pathname.match(/^\/@([a-z0-9\.-]+)/)
    if(m && m.length === 2) {
        const username = m[1]
        yield fork(fetchFollowCount, username)
        yield fork(loadFollows, "getFollowersAsync", username, 'blog')
        yield fork(loadFollows, "getFollowingAsync", username, 'blog')
    }

    // `ignore_fetch` case should only trigger on initial page load. No need to call
    // fetchState immediately after loading fresh state from the server. Details: #593
    const server_location = yield select(state => state.offchain.get('server_location'));
    const ignore_fetch = (pathname === server_location && is_initial_state)
    is_initial_state = false;
    if(ignore_fetch) return;

    let url = `${pathname}`;
    if (url === '/') url = 'trending';
    // Replace /curation-rewards and /author-rewards with /transfers for UserProfile to resolve data correctly
    if (url.indexOf("/curation-rewards") !== -1) url = url.replace("/curation-rewards", "/transfers");
    if (url.indexOf("/author-rewards") !== -1) url = url.replace("/author-rewards", "/transfers");

    try {
        let state = {};

        // if empty or equal '/''
        if (!url || typeof url !== 'string' || !url.length || url === '/') url = 'trending';
        // remove / from start
        if (url[0] === '/') url = url.substr(1)
        // get parts of current url
        const parts = url.split('/')
        // create tag
        const tag = typeof parts[1] !== "undefined" ? parts[1] : ''

        // TODO fix bread ration
        if (parts[0][0] === '@' || typeof parts[1] === 'string' && parts[1][0] === '@') {
            state = yield call([api, api.getStateAsync], url)
        }
        else {
          yield put({type: 'global/FETCHING_STATE', payload: true});
          const dynamic_global_properties = yield call([api, api.getDynamicGlobalPropertiesAsync])
          const feed_history              = yield call([api, api.getFeedHistoryAsync])

          state.current_route = url;
          state.props = dynamic_global_properties;
          state.categories = {};
          state.tags = {};
          state.content = {};
          state.accounts = {};
          state.witnesses = {};
          state.discussion_idx = {};
          state.feed_price = feed_history.current_median_history; // { "base":"1.000 GBG", "quote":"1.895 GOLOS" },

          state.select_tags = [];
          state.filter_tags = [];

          if (parts[0][0] === '@') {
            const uname = parts[0].substr(1)
            accounts[uname] = yield call([api, api.getAccountsAsync], [uname]);

            // FETCH part 2
            switch (parts[1]) {
              case 'transfers':
                break;

              case 'posts':
              case 'comments':
                break;

              case 'blog':
                break;

              case 'feed':
                break;

              // default:
            }
          }
          else if (parts[0] === 'witnesses' || parts[0] === '~witnesses') {
            const wits = yield call([api, api.getWitnessesByVoteAsync], '', 100);
            for (let key in wits) state.witnesses[wits[key].owner] = wits[key];
          }
          else if ([ 'trending', 'trending30', 'promoted', 'responses', 'hot', 'votes', 'cashout', 'active', 'created', 'recent' ].indexOf(parts[0]) >= 0) {
            const args = [{
              limit: constants.FETCH_DATA_BATCH_SIZE,
              truncate_body: constants.FETCH_DATA_TRUNCATE_BODY
            }]
            if (typeof tag === 'string' && tag.length) {
              args[0].select_tags = [tag];

            }
            else {
              const select_tags = cookie.load(SELECT_TAGS_KEY);
              if (!tag && select_tags && select_tags.length) {
                args[0].select_tags = state.select_tags = select_tags
              }
              else {
                args[0].filter_tags = state.filter_tags = IGNORE_TAGS
              }
            }
            const discussions = yield call([api, api[PUBLIC_API[parts[0]][0]]], ...args);
            let accounts = []
            let discussion_idxes = {}
            discussion_idxes[ PUBLIC_API[parts[0]][1] ] = []
            for (let i in discussions) {
              const key = discussions[i].author + '/' + discussions[i].permlink;
              discussion_idxes[ PUBLIC_API[parts[0]][1] ].push(key);
              if (discussions[i].author && discussions[i].author.length)
                accounts.push(discussions[i].author);
              state.content[key] = discussions[i];
            }
            const discussions_key = typeof tag === 'string' && tag.length ? tag : state.select_tags.sort().join('/')
            state.discussion_idx[discussions_key] = discussion_idxes
            accounts = yield call([api, api.getAccountsAsync], accounts);
            for (let i in accounts) {
              state.accounts[ accounts[i].name ] = accounts[i]
            }
          }
          else if (parts[0] == "tags") {
            // by default trending tags limit=50, but if we in '/tags/' path then limit = 250
            const trending_tags = yield call([api, api.getTrendingTagsAsync], '', parts[0] == "tags" ? '250' : '50');
            for (let i in trending_tags) {
              state.tags[trending_tags[i].name] = trending_tags[i]
            }
          }

          for (var key in state.content)
            state.content[key].active_votes = []
         
          yield put({type: 'global/FETCHING_STATE', payload: false});
        }

        yield put(GlobalReducer.actions.receiveState(state));
    } catch (error) {
        console.error('~~ Saga fetchState error ~~>', url, error);
        yield put({type: 'global/FETCHING_STATE', payload: false});
        yield put({type: 'global/CHAIN_API_ERROR', error: error.message});
    }
}

export function* watchDataRequests() {
    yield* takeLatest('REQUEST_DATA', fetchData);
}

export function* fetchData(action) {
    const {order, author, permlink, accountname, keys} = action.payload;
    let {category} = action.payload;
    if( !category ) category = "";
    category = category.toLowerCase();

    let call_name, args;
    args = [{
      limit: constants.FETCH_DATA_BATCH_SIZE,
      truncate_body: constants.FETCH_DATA_TRUNCATE_BODY,
      start_author: author,
      start_permlink: permlink
    }];
    if (category.length) {
      args[0].select_tags = [category];
    } else {
      let select_tags = cookie.load(SELECT_TAGS_KEY);
      if (select_tags && select_tags.length) {
        args[0].select_tags = select_tags;
        category = select_tags.sort().join('/')
      }
      else {
        args[0].filter_tags = IGNORE_TAGS
      }
    }

    yield put({type: 'global/FETCHING_DATA', payload: {order, category}});

    if (order === 'trending') {
        call_name = 'getDiscussionsByTrendingAsync';
    } else if (order === 'trending30') {
        call_name = 'getDiscussionsByTrending30Async';
    } else if (order === 'promoted') {
        call_name = 'getDiscussionsByPromotedAsync';
    } else if( order === 'active' ) {
        call_name = 'getDiscussionsByActiveAsync';
    } else if( order === 'cashout' ) {
        call_name = 'getDiscussionsByCashoutAsync';
    } else if( order === 'payout' ) {
        call_name = 'getPostDiscussionsByPayoutAsync';
    } else if( order === 'payout_comments' ) {
        call_name = 'getCommentDiscussionsByPayoutAsync';
    } else if( order === 'updated' ) {
        call_name = 'getDiscussionsByActiveAsync';
    } else if( order === 'created' || order === 'recent' ) {
        call_name = 'getDiscussionsByCreatedAsync';
    } else if( order === 'by_replies' ) {
        call_name = 'getRepliesByLastUpdateAsync';
        args = [author, permlink, constants.FETCH_DATA_BATCH_SIZE];
    } else if( order === 'responses' ) {
        call_name = 'getDiscussionsByChildrenAsync';
    } else if( order === 'votes' ) {
        call_name = 'getDiscussionsByVotesAsync';
    } else if( order === 'hot' ) {
        call_name = 'getDiscussionsByHotAsync';
    } else if( order === 'by_feed' ) { // https://github.com/steemit/steem/issues/249
        call_name = 'getDiscussionsByFeedAsync';
        delete args[0].select_tags
        args[0].select_authors = [accountname];
    } else if( order === 'by_author' ) {
        call_name = 'getDiscussionsByBlogAsync';
        delete args[0].select_tags
        args[0].select_authors = [accountname];
    } else if( order === 'by_comments' ) {
        call_name = 'getDiscussionsByCommentsAsync';
    } else {
        call_name = 'getDiscussionsByActiveAsync';
    }
    try {
        const data = yield call([api, api[call_name]], ...args);
        yield put(GlobalReducer.actions.receiveData({data, order, category, author, permlink, accountname, keys}));
    } catch (error) {
        console.error('~~ Saga fetchData error ~~>', call_name, args, error);
        yield put({type: 'global/CHAIN_API_ERROR', error: error.message});
    }
}

// export function* watchMetaRequests() {
//     yield* takeLatest('global/REQUEST_META', fetchMeta);
// }
// export function* fetchMeta({payload: {id, link}}) {
//     try {
//         const metaArray = yield call(() => new Promise((resolve, reject) => {
//             function reqListener() {
//                 const resp = JSON.parse(this.responseText)
//                 if (resp.error) {
//                     reject(resp.error)
//                     return
//                 }
//                 resolve(resp)
//             }
//             const oReq = new XMLHttpRequest()
//             oReq.addEventListener('load', reqListener)
//             oReq.open('GET', '/http_metadata/' + link)
//             oReq.send()
//         }))
//         const {title, metaTags} = metaArray
//         let meta = {title}
//         for (let i = 0; i < metaTags.length; i++) {
//             const [name, content] = metaTags[i]
//             meta[name] = content
//         }
//         // http://postimg.org/image/kbefrpbe9/
//         meta = {
//             link,
//             card: meta['twitter:card'],
//             site: meta['twitter:site'], // @username tribbute
//             title: meta['twitter:title'],
//             description: meta['twitter:description'],
//             image: meta['twitter:image'],
//             alt: meta['twitter:alt'],
//         }
//         if(!meta.image) {
//             meta.image = meta['twitter:image:src']
//         }
//         yield put(GlobalReducer.actions.receiveMeta({id, meta}))
//     } catch(error) {
//         yield put(GlobalReducer.actions.receiveMeta({id, meta: {error}}))
//     }
// }

export function* watchFetchJsonRequests() {
    yield* takeEvery('global/FETCH_JSON', fetchJson);
}

/**
    @arg {string} id unique key for result global['fetchJson_' + id]
    @arg {string} url
    @arg {object} body (for JSON.stringify)
*/
function* fetchJson({payload: {id, url, body, successCallback, skipLoading = false}}) {
    try {
        const payload = {
            method: body ? 'POST' : 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        }
        yield put({type: 'global/FETCHING_JSON', payload: true});
        let result = yield skipLoading ? fetch(url, payload) : call(fetch, url, payload)
        result = yield result.json()
        if (successCallback) result = successCallback(result)
        yield put({type: 'global/FETCHING_JSON', payload: false});
        yield put(GlobalReducer.actions.fetchJsonResult({id, result}))
    } catch(error) {
        console.error('fetchJson', error)
        yield put({type: 'global/FETCHING_JSON', payload: false});
        yield put(GlobalReducer.actions.fetchJsonResult({id, error}))
    }
}

export function* watchFetchExchangeRates() {
    yield* takeEvery('global/FETCH_EXCHANGE_RATES', fetchExchangeRates);
}

export function* fetchExchangeRates() {
  const fourHours = 1000 * 60 * 60 * 4;

  try {
    const created = localStorage.getItem('xchange.created') || 0;

    let pickedCurrency = localStorage.getItem('xchange.picked') || DEFAULT_CURRENCY;
    if (pickedCurrency.localeCompare(DEBT_TOKEN_SHORT) == 0) {
      pickedCurrency = DEFAULT_CURRENCY;
    }
    if (Date.now() - created < fourHours) {
      return;
    }
    // xchange rates are outdated or not exists
    console.log('xChange rates are outdated or not exists, fetching...')

    yield put({type: 'global/FETCHING_JSON', payload: true});

    let result = yield call(fetch, '/api/v1/rates/');
    result = yield result.json();

    if (result.error) {
      console.log('~~ Saga fetchExchangeRates error ~~>', '[0] The result is undefined.');
      storeExchangeValues();
      yield put({type: 'global/FETCHING_XCHANGE', payload: false});
      return;
    }
    if (
      typeof result === 'object' &&
      typeof result.rates === 'object' &&
      typeof result.rates.XAU === 'number' &&
      typeof result.rates[pickedCurrency] === 'number'
    ) {
      // store result into localstorage
      storeExchangeValues(Date.now(), 1/result.rates.XAU, result.rates[pickedCurrency], pickedCurrency);
    }
    else {
      console.log('~~ Saga fetchExchangeRates error ~~>', 'The result is undefined.');
      storeExchangeValues();
    }
    yield put({type: 'global/FETCHING_XCHANGE', payload: false});
  }
  catch(error) {
    // set default values
    storeExchangeValues();
    console.error('~~ Saga fetchExchangeRates error ~~>', error);
    yield put({type: 'global/FETCHING_XCHANGE', payload: false});
  }
}

function storeExchangeValues(created, gold, pair, picked) {
  localStorage.setItem('xchange.created', created || 0);
  localStorage.setItem('xchange.gold', gold || 1);
  localStorage.setItem('xchange.pair', pair || 1);
  localStorage.setItem('xchange.picked', picked || DEBT_TOKEN_SHORT);
}
