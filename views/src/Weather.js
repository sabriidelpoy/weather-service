/* Weather React Component for rendering current weather, updating data once per minuit */

import React from 'react';

const intervalApiCall = 60000;

class Weather extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            condition_text: '',
            condition_icon: '',
            temp_c: 0,
            humidity: 0,
            loading: true,
            error: ''
        };
    }
    componentDidMount() {
        this.interval = setInterval(
          () => this.getData(),
          intervalApiCall
        );
    }
    componentWillMount() {
        this.getData();
    }
    componentWillUnmount() {
        clearInterval(this.interval);
    }
    getData(){
        fetch('/current-weather')
          .then(
            response => {
              if (response.status !== 200) {
                 this.setState({
                     loading:false,
                     error:response.status
                 });
                return;
              }
              response.json().then(current => {
                 this.setState({
                    condition_text: current.condition_text,
                    condition_icon: current.condition_icon,
                    temp_c: current.temp_c,
                    humidity: current.humidity,
                    loading:false,
                    error:''
                  });
              });
            }
          )
          .catch(err => {
             this.setState({
                 loading:false,
                 error:err
             });
          });
    }
    render() {
        return (
            <div>
                 {this.state.loading ? (
                    <h1>Cargando...</h1>
                  ) : this.state.error ? ( 
                        <h1>Ocurrió un error obteniendo la información: {this.state.error}</h1>
                  ) : (
                    <div className="Weather">
                        <h1>El clima actual en Buenos Aires está: <span>{this.state.condition_text}</span></h1>
                        <img alt={this.state.condition_text} src={this.state.condition_icon}/>
                        <h4>Temperatura: <span>{this.state.temp_c}°C</span></h4>
                        <h4>Humedad: <span>{this.state.humidity}%</span></h4>
                    </div>
                )}
            </div>
        );
  }
}

          
export default Weather;