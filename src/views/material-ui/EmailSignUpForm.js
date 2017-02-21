import React, { PropTypes } from "react";
import Input from "./Input";
import ButtonLoader from "./ButtonLoader";
import { emailSignUpFormUpdate, emailSignUp } from "../../actions/email-sign-up";
import { connect } from "react-redux";
import ContentSend from "material-ui/svg-icons/content/send";

class EmailSignUpForm extends React.Component {
  static propTypes = {
    endpoint: PropTypes.string,
    next: PropTypes.func,
    inputProps: PropTypes.shape({
      email: PropTypes.object,
      password: PropTypes.object,
      passwordConfirmation: PropTypes.object,
      submit: PropTypes.object
    })
  };

  static defaultProps = {
    next: () => {},
    inputProps: {
      email: {},
      password: {},
      submit: {}
    }
  };

  getEndpoint () {
    return (
      this.props.endpoint ||
      this.props.auth.getIn(["configure", "currentEndpointKey"]) ||
      this.props.auth.getIn(["configure", "defaultEndpointKey"])
    );
  }

  handleInput (key, val) {
    this.props.dispatch(emailSignUpFormUpdate(this.getEndpoint(), key, val));
  }

  handleSubmit (event) {
    console.log("@-->handling submit");
    event.preventDefault();
    let formData = this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "form"]).toJS();
    this.props.dispatch(emailSignUp(formData, this.getEndpoint()))
      .then(this.props.next)
      .catch(() => {});
  }

  render () {
    let disabled = (
      this.props.auth.getIn(["user", "isSignedIn"]) ||
      this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "loading"])
    );

    return (
      <form className='redux-auth email-sign-up-form clearfix'
            style={{clear: "both", overflow: "hidden"}}
            onSubmit={this.handleSubmit.bind(this)}>

        <Input type="text"
               floatingLabelText="Full name"
               className="email-sign-up-name"
               disabled={disabled}
               value={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "form", "name"])}
               errors={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "errors", "name"])}
               onChange={this.handleInput.bind(this, "name")}
               {...this.props.inputProps.name} />

        <Input type="email"
               floatingLabelText="Email"
               className="email-sign-up-email"
               disabled={disabled}
               value={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "form", "email"])}
               errors={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "errors", "email"])}
               onChange={this.handleInput.bind(this, "email")}
               {...this.props.inputProps.email} />

        <Input type="tel"
               floatingLabelText="Mobile"
               className="email-sign-up-mobile"
               disabled={disabled}
               value={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "form", "mobile"])}
               errors={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "errors", "mobile"])}
               onChange={this.handleInput.bind(this, "mobile")}
               {...this.props.inputProps.mobile} />

        <Input type="password"
               floatingLabelText="Password"
               className="email-sign-up-password"
               disabled={disabled}
               value={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "form", "password"])}
               errors={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "errors", "password"])}
               onChange={this.handleInput.bind(this, "password")}
               {...this.props.inputProps.password} />

        <br/>

        <ButtonLoader loading={this.props.auth.getIn(["emailSignUp", this.getEndpoint(), "loading"])}
                      type="submit"
                      className="email-sign-up-submit"
                      primary={true}
                      style={{float: "right"}}
                      icon={ContentSend}
                      disabled={disabled}
                      onClick={this.handleSubmit.bind(this)}
                      {...this.props.inputProps.submit}>
          Sign Up
        </ButtonLoader>
      </form>
    );
  }
}

export default connect((state) => ({ auth: state.get('auth') }))(EmailSignUpForm);
