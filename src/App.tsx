import { Navbar, Welcome, Transactions, Service, Footer } from './components';

const App = () => {
  return (
    <div className='min-h-screen'>
      <div className='gradient-bg-welcome'>
        <Navbar />
        <Welcome />
      </div>
      <Service />
      <Transactions />
      <Footer />
    </div>

  );
}

export default App;
