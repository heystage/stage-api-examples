import React from 'react';
import { Configuration, StageApi } from 'stage-typescript';
import './App.css';

const stageApi = new StageApi(
  new Configuration({
    // The read-only key is safe to use in your frontend react application. 
    // Do not use a read-write key on the frontend application.
    // Update this in the project .env file
    accessToken: process.env.REACT_APP_STAGE_READ_ONLY_API_KEY,
    basePath: 'https://api.heystage.com/sdk-api',
    baseOptions: {
      headers: {
        accept: "application/vnd.heystage.v1+json",
        origin: window.location.href // for browser integrations
      }
    }
  }),
)

function App() {

  const [plans, setPlans] = React.useState()
  const [purchased, setPurchased] = React.useState(false)

  async function fetchPublishedPlans() {
    const planData = (await stageApi.getPlansForUsers({})).data
    setPlans(planData?.items?.filter(p => !p.draft))
  }

  function purchasePlan(stripeProductId) {
    // At this point you should begin the stripe checkout process
    // by passing this stripe product id to your backend server
    // to create a stripe checkout session with it.
    setPurchased(stripeProductId)
  }
  
  React.useEffect(() => {
    fetchPublishedPlans()
  }, [])


  return (
    <div className="App">
      <header className="App-header">
        <div className='plan-container'>        
        {plans && plans.map(plan => 
          <div key={plan.identifier} className='plan-item'>
            <div className='plan-name'>{plan.name}</div>
            <div className='plan-divider' />
            <div className='plan-description'>{plan.description}</div>
            <div className='plan-divider' />
            <div className='plan-features'>
              {plan.features.items.map(feature => 
                <div key={feature.identifier} className='plan-feature'>
                  <div style={{fontSize: 15}}>{feature.name}</div>
                  <div style={{fontSize: 13, fontWeight: 'bold'}}>{feature.limit ?  ` x ${feature.limit}` : `∞`}</div>
                </div>
                )}
            </div>
            <div className='plan-divider' />
            <div className='plan-pricing'>
              {plan.monthlyUnitAmount === 0 
                ? 
                  <div style={{fontSize: 32, fontWeight: 'bold'}}>Free</div> 
                : <>
                  <div style={{fontWeight: 'bold'}}>${plan.monthlyUnitAmount / 100} / month</div>
                  {plan.yearlyUnitAmount > 0 && <div style={{fontWeight: 'bold'}}>${plan.yearlyUnitAmount / 100} / year</div>}
                </>
              }
            </div>
            <button disabled={purchased} className='plan-purchase' onClick={() => purchasePlan(plan.stripeProductId)}>Purchase</button>
          </div>)}
        </div>
        {purchased && <div style={{marginTop: 25, fontStyle: 'italic'}}>
          You have purchaed a plan with <div style={{fontWeight: 'bold'}}>stripeProductId = {purchased}</div>
        </div>}
      </header>
    </div>
  );
}

export default App;
