import React from 'react';
import { Link } from 'react-router';
import apiClient from 'panoptes-client/lib/api-client';
import Pullout from 'react-pullout';
import qs from 'qs';
import BlurredImage from './blurred-image';
import CircleRibbon from './circle-ribbon';
import RecentProjectsSection from './recent-projects';
import RecentCollectionsSection from './recent-collections';
import RecentMessagesSection from './recent-messages';
import MyBuildsSection from './my-builds';
import ProjectStats from './project-stats';
import HomePageSocial from '../home-not-logged-in/social';
import NewsSection from './news-pullout';
import getColorFromString from '../../lib/get-color-from-string';


const SECTIONS = {
  projects: RecentProjectsSection,
  collections: RecentCollectionsSection,
  messages: RecentMessagesSection,
  builds: MyBuildsSection,
};

const HomePageForUser = React.createClass({
  propTypes: {
    user: React.PropTypes.object.isRequired,
    location: React.PropTypes.object,
  },

  contextTypes: {
    setAppHeaderVariant: React.PropTypes.func,
  },

  getDefaultProps() {
    return {
      user: {},
    };
  },

  getInitialState() {
    return {
      backgroundSrc: '',
      avatarSrc: '',
      showNews: false,
      totalClassifications: 0,
      ribbonData: [],
      loading: false,
      error: null,
      selectedProjectID: null,
      openSection: null,
    };
  },

  componentDidMount() {
    this.context.setAppHeaderVariant('detached');
    addEventListener('hashChange', this.handleHashChange);
    this.fetchRibbonData(this.props.user);
  },

  componentWillReceiveProps(nextProps) {
    if (nextProps.user !== this.props.user) {
      this.fetchRibbonData(nextProps.user);
    }
  },

  componentWillUnmount() {
    this.context.setAppHeaderVariant(null);
    removeEventListener('hashChange', this.handleHashChange);
  },

  handleHashChange() {
    this.forceUpdate();
  },

  fetchRibbonData(user) {
    if (!user) {
      return;
    }

    this.setState({
      loading: true,
      error: null,
    });

    user.get('profile_header')
    .catch(() => {
      return [];
    })
    .then((profileHeaders) => {
      const profileHeader = [].concat(profileHeaders)[0];
      if (!!profileHeader) {
        this.setState({
          backgroundSrc: profileHeader.src,
        });
      }
    });

    user.get('avatar')
    .catch((error) => {
      console.log('Something went wrong. Error: ', error);
    })
    .then((avatars) => {
      const avatar = [].concat(avatars)[0];
      if (!!avatar) {
        this.setState({
          avatarSrc: avatar.src,
        });
      }
    });

    this.getRibbonData(user)
    .catch((error) => {
      this.setState({ error });
    })
    .then(() => {
      this.setState({
        loading: false,
      });
    });
  },

  getRibbonData(user, _page = 1) {
    const getRibbonData = this.getRibbonData;
    return user.get('project_preferences', {
      page: _page,
    })
    .then((projectPreferences) => {
      if (projectPreferences.length === 0) {
        return projectPreferences;
      } else {
        const activePreferences = projectPreferences.filter((preference) => {
          if (preference.activity_count > 0)
            return preference;
        });
        const projectIDs = activePreferences.map((projectPreference) => {
          return projectPreference.links.project;
        });
        apiClient.type('projects').get({ id: projectIDs, cards: true, page_size: activePreferences.length })
          .catch((error) => {
            console.log('Something went wrong. Error: ', error);
          })
          .then((projects) =>{
            const classifications = activePreferences.reduce((counts, projectPreference) => {
              counts[projectPreference.links.project] = projectPreference.activity_count;
              return counts;
            }, {});
            const projectData = projects.map((project) => {
              project.activity_count = classifications[project.id]
              return project;
            });
            return projectData;
          })
          .then((projects) => {
            return projects.map((project, i) => {
              if (projects[i] !== null) {
                return {
                  avatar_src: projects[i].avatar_src,
                  id: projects[i].id,
                  slug: projects[i].slug,
                  name: projects[i].display_name,
                  color: getColorFromString(projects[i].slug),
                  classifications: projects[i].activity_count,
                  updated_at: projects[i].updated_at,
                };
              } else {
                return null;
              }
            }).filter(Boolean);
          })
          .then((projects) =>{
            this.setState((prevState) => {
              const ribbonData = prevState.ribbonData.concat(projects);
              const updatedProjects = this.recentlyUpdatedProjects(ribbonData);
              const totalClassifications = updatedProjects.reduce((total, project) => {
          return total + project.classifications;
        }, 0);
              return {ribbonData, updatedProjects, totalClassifications };
            });
          });
        const meta = projectPreferences[0].getMeta();
        if (meta.page === meta.page_count) {
        } else {
          getRibbonData(user, meta.page + 1);
        }
      }
    });
  },

  recentlyUpdatedProjects(data) {
    return data.sort((a, b) => {
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  },

  findProjectLink(project) {
    return `/projects/${project.slug}`;
  },

  toggleNews() {
    this.setState({
      showNews: !this.state.showNews,
    });
  },

  renderMenu(openComponent) {
    if ((openComponent) && (screen.width < 700)) {
      return;
    }
    return (
      <div className="home-page-for-user__menu">
        <div className="home-page-for-user__menu-column">
          <Link to="#focus=projects" className="home-page-for-user__menu-button">
            <span className="home-page-for-user__menu-label">
              <i className="fa fa-history fa-fw"></i>{' '}
              My recent projects
            </span>
          </Link>
          <Link to="#focus=collections" className="home-page-for-user__menu-button">
            <span className="home-page-for-user__menu-label">
              <i className="fa fa-th-large fa-fw"></i>{' '}
              My collections
            </span>
          </Link>
        </div>
        <div className="home-page-for-user__menu-column">
          <Link to="#focus=messages" className="home-page-for-user__menu-button">
            <span className="home-page-for-user__menu-label">
              <i className="fa fa-envelope fa-fw"></i>{' '}
              Messages
            </span>
          </Link>
          <Link to="#focus=builds" className="home-page-for-user__menu-button">
            <span className="home-page-for-user__menu-label">
              <i className="fa fa-cog fa-fw"></i>{' '}
              My builds
            </span>
          </Link>
        </div>
      </div>
    );
  },

  render() {
    if (!this.props.user) return null;

    let avatarSrc = this.state.avatarSrc;
    if (!avatarSrc) {
      avatarSrc = '/assets/simple-avatar.png';
    }

    const hashQuery = qs.parse(this.props.location.hash.slice(1));

    const OpenSectionComponent = SECTIONS[hashQuery.focus];

    return (
      <div className="on-home-page">
        <div className="home-page-for-user">
          <BlurredImage className="home-page-for-user__background" src={this.state.backgroundSrc} blur="0.5em" position="50% 33%" />

          {!!this.state.error && (
            <div>{this.state.error.toString()}</div>
          )}

          {!!hashQuery.project ? (
            <ProjectStats projectID={hashQuery.project} onClose={this.deselectProject} />
          ) : (
            <div className="home-page-for-user__content" style={{ position: 'relative', zIndex: 1 }}>
              <CircleRibbon user={this.props.user} loading={this.state.loading} image={avatarSrc} data={this.state.ribbonData} hrefTemplate={this.findProjectLink} />

              <div className="home-page-for-user__welcome">
                Hello {this.props.user.display_name},<br/>
                you've made {this.state.totalClassifications} classifications to date.
              </div>

              {this.renderMenu(OpenSectionComponent)}

              {OpenSectionComponent && (
                <OpenSectionComponent
                  updatedProjects={this.state.updatedProjects}
                  projects={this.state.ribbonData}
                  onClose={this.deselectSection}
                />
              )}
            </div>
          )}

          <Pullout className="home-page-news-pullout" side="right" open={this.state.showNews}>
            <button type="button" className="secret-button home-page-news-pullout__toggle-button" onClick={this.toggleNews}>
              <div className="home-page-news-pullout__toggle-label">
                <i className={this.state.showNews ? "fa fa-chevron-right" : "fa fa-chevron-left"}></i>
                <br />
                News
              </div>
            </button>

            <NewsSection updatedProjects={this.state.updatedProjects} toggleNews={this.toggleNews} showNews={this.state.showNews} />

          </Pullout>
        </div>

        <div className="home-page-for-user on-home-page-logged-in">
          <HomePageSocial />
        </div>

      </div>
    );
  },
});

export default HomePageForUser;
