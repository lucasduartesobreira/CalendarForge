import CreateEventButton, { CreateEventForm } from './components/createEvent/createEvent'

const Home = () => {
  return (
    <main className="flex flex-col gap-y-px min-h-screen items-center justify-between border-4 bg-black">
      <div className='min-w-full flex-none w-12 h-12 border-2 border-red-500'>Navbar</div>
      <div className='flex flex-auto h-full w-full border-4 border-red-700'>
        <div className='flex-auto border-2 border-red-400 h-11/12'>Side Bar</div>
        <div className='flex-auto w-8/12'>Calendar</div>
      </div>
      <CreateEventButton/>
    </main>
  )
}

export default Home
