import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, Box, Typography, CircularProgress } from '@material-ui/core';
import { connect } from 'react-redux';
import { fetchVotes, fetchMyVote, castVote, updateKarma } from '../actions';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ErrorIcon from '@material-ui/icons/Error';
import util from '../util';
import approx from 'approximate-number';

const styles = theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  center: {
    textAlign: 'center',
  },
  inlineBlock: {
    display: 'inline-block',
  },
  upArrow: {
    color: 'orange',
    position: 'absolute',
  },
  downArrow: {
    color: 'cornflowerblue',
    position: 'absolute',
  },
});

class VoteView extends React.Component {
  static maxWeight = 15;

  static capWeight(weight) {
    return Math.min(VoteView.maxWeight, Math.max(weight, -VoteView.maxWeight));
  }

  static calculateWeight(keyHash, inTermsOf, karmaMap) {
    return VoteView.capWeight(
      inTermsOf.map(tag => (karmaMap[keyHash + ':' + tag] || 0)).reduce((a, b) => a + b, 0)
    );
  }

  state = {
    votesCache: false,
    myVoteCache: false,
  }

  constructor(props) {
    super(props);
    this.foregroundUpArrow = React.createRef();
    this.backgroundUpArrow = React.createRef();
    this.foregroundDownArrow = React.createRef();
    this.backgroundDownArrow = React.createRef();
  }

  componentDidMount() {
    this.cache();
  }

  componentDidUpdate(prevProps) {
    this.invalidateCache(prevProps);
    this.cache();
  }

  cache() {
    if (!this.props.holochainConnected) { return; }

    if (!this.state.votesCache) {
      this.getVotes();
      this.setState(state => ({ ...state, votesCache: true }));
    }

    if (!this.state.myVoteCache) {
      this.getMyVote();
      this.setState(state => ({ ...state, myVoteCache: true }));
    }
  }

  invalidateCache(prevProps) {
    if ((prevProps.address !== this.props.address) || (prevProps.inTermsOf !== this.props.inTermsOf)) {
      this.setState(state => ({ ...state, votesCache: false, myVoteCache: false }));
    }
  }

  getVotes() {
    this.props.fetchVotes(this.props.address, this.props.callZome);
  }

  getMyVote = () => {
    this.props.fetchMyVote(this.props.address, this.getInTermsOf(), this.props.callZome);
  }

  calculateScore(votes, inTermsOf) {
    return votes.map(vote =>
      vote.fraction * VoteView.calculateWeight(vote.key_hash, inTermsOf, this.props.karmaMap)
    ).reduce((a, b) => a + b, 0);
  }

  getArrowPaths() {
    const myVotes = this.props.myVotes[this.props.address];
    if (myVotes) {
      const myVote = myVotes[util.inTermsOfToString(this.getInTermsOf())];
      if (myVote && myVote.Ok) {
        const voteAmount = myVote.Ok.fraction;
        const fromBottom = percent => `polygon(0px 100%, 0px ${(1 - percent) * 100}%, 100% ${(1 - percent) * 100}%, 100% 100%)`;
        const fromTop = percent => `polygon(0px 0px, 0px ${percent * 100}%, 100% ${percent * 100}%, 100% 0px)`;

        return {
          upArrowBackgroundPath: fromTop(1 - voteAmount),
          upArrowForegroundPath: fromBottom(voteAmount),
          downArrowBackgroundPath: fromBottom(1 + voteAmount),
          downArrowForegroundPath: fromTop(-voteAmount),
        };
      }
    }

    const polygonFull = 'polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%)';
    const polygonEmpty = 'polygon(0px 0px, 0px 0px, 0px 0px, 0px 0px)';

    return {
      upArrowBackgroundPath: polygonFull,
      upArrowForegroundPath: polygonEmpty,
      downArrowBackgroundPath: polygonFull,
      downArrowForegroundPath: polygonEmpty,
    };
  }

  onClickVote = (positive, ref) => event => {
    if (!this.state.myVoteCache) { return; }
    const rect = ref.current.getBoundingClientRect();
    let whereClicked = (event.nativeEvent.clientY - rect.y) / rect.height;
    whereClicked = Math.max(.25, Math.min(.75, whereClicked));
    whereClicked = (whereClicked - .25) * 2;
    let weight;
    if (positive) {
      weight = 1 - whereClicked;
    } else {
      weight = -whereClicked;
    }

    this.props.castVote(this.props.address, util.getUtcUnixTime(), weight, this.getInTermsOf(), this.props.callZome)
      .then(() => {
        const myVotes = this.props.myVotes[this.props.address];
        if (myVotes) {
          const myVote = myVotes[util.inTermsOfToString(this.getInTermsOf())];
          if (myVote && myVote.Ok) {
            this.props.updateKarma(-myVote.Ok.fraction, this.props.keyHash, this.getInTermsOf());
          }
        }
        this.props.updateKarma(weight, this.props.keyHash, this.getInTermsOf());

        this.setState(state => ({ ...state, votesCache: false, myVoteCache: false }));
        this.cache();
      });
  }

  render() {
    const votes = this.props.votes[this.props.address];
    const inTermsOf = this.getInTermsOf();

    if (votes && inTermsOf) {
      if (votes.Ok) {
        const {
          upArrowBackgroundPath,
          upArrowForegroundPath,
          downArrowBackgroundPath,
          downArrowForegroundPath,
        } = this.getArrowPaths();
        return (
          <Box className={this.props.classes.center}>
            <Box className={this.props.classes.inlineBlock}>
              <Box className={this.props.classes.root}>
                <ArrowUpwardIcon ref={this.backgroundUpArrow} onClick={this.onClickVote(true, this.backgroundUpArrow)} style={{ clipPath: upArrowBackgroundPath }} />
                <ArrowUpwardIcon ref={this.foregroundUpArrow} onClick={this.onClickVote(true, this.foregroundUpArrow)} style={{ clipPath: upArrowForegroundPath }} className={this.props.classes.upArrow} />
              </Box>
            </Box>
            <Typography variant="body1">{approx(this.calculateScore(votes.Ok, inTermsOf))}</Typography>
            <Box className={this.props.classes.inlineBlock}>
              <Box className={this.props.classes.root}>
                <ArrowDownwardIcon ref={this.backgroundDownArrow} onClick={this.onClickVote(false, this.backgroundDownArrow)} style={{ clipPath: downArrowBackgroundPath }} />
                <ArrowDownwardIcon ref={this.foregroundDownArrow} onClick={this.onClickVote(false, this.foregroundDownArrow)} style={{ clipPath: downArrowForegroundPath }} className={this.props.classes.downArrow} />
              </Box>
            </Box >
          </Box>
        );
      } else {
        return (
          <ErrorIcon />
        );
      }
    } else {
      return (
        <CircularProgress />
      );
    }
  }

  getInTermsOf() {
    return this.props.inTermsOf || [];
  }
}

VoteView.propTypes = {
  address: PropTypes.string.isRequired,
  inTermsOf: PropTypes.array,
  votes: PropTypes.object.isRequired,
  karmaMap: PropTypes.object.isRequired,
  holochainConnected: PropTypes.bool.isRequired,
  callZome: PropTypes.func,
  classes: PropTypes.object.isRequired,
  myVotes: PropTypes.object.isRequired,
  fetchMyVote: PropTypes.func.isRequired,
  castVote: PropTypes.func.isRequired,
  updateKarma: PropTypes.func.isRequired,
  keyHash: PropTypes.string.isRequired,
};

const propsMap = props => ({
  votes: props.votes,
  karmaMap: props.karmaMap,
  holochainConnected: props.holochainConnected,
  callZome: props.callZome,
  myVotes: props.myVotes,
});

export default connect(propsMap, { fetchVotes, fetchMyVote, castVote, updateKarma })(withStyles(styles)(VoteView));
