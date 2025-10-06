import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination( { currentPage, totalPages, goToPage } ) {

  return (

    <div className='flex items-center justify-center gap-2 mt-6'>

      {/* First Page */}
      <button
        onClick={() => goToPage( 1 )}
        disabled={currentPage === 1}
        className='p-2 disabled:opacity-50'
      >
        <ChevronLeft size={20} />
      </button>

      {/* Previous Page */}
      <button
        onClick={() => goToPage( currentPage - 1 )}
        disabled={currentPage === 1}
        className='p-2 disabled:opacity-50'
      >
        <ChevronLeft size={20} />
      </button>

      {/* Page Numbers */}
      <span className='text-sm font-medium'>
        Page {currentPage} of {totalPages}
      </span>

      {/* Next Page */}
      <button
        onClick={() => goToPage( currentPage + 1 )}
        disabled={currentPage >= totalPages}
        className='p-2 disabled:opacity-50'
      >
        <ChevronRight size={20} />
      </button>

      {/* Last Page */}
      <button
        onClick={() => goToPage( totalPages )}
        disabled={currentPage >= totalPages}
        className='p-2 disabled:opacity-50'
      >
        <ChevronRight size={20} />
      </button>

    </div>

  )

}