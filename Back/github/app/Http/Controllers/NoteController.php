<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Note;
use Illuminate\Support\Facades\Auth;

class NoteController extends Controller
{
    public function index()
    {
        return Note::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|max:100',
            'content' => 'nullable',
            'priority' => 'required'
        ]);

        $note = Note::create([
            'title' => $request->title,
            'content' => $request->content,
            'priority' => $request->priority,
            'user_id' => Auth::id()
        ]);

        return response()->json($note);
    }

    public function update(Request $request, $id)
    {
        $note = Note::where('user_id', Auth::id())
            ->where('id', $id)
            ->firstOrFail();

        $note->update([
            'title' => $request->title,
            'content' => $request->content,
            'priority' => $request->priority
        ]);

        return response()->json($note);
    }

    public function destroy($id)
    {
        $note = Note::where('user_id', Auth::id())
            ->where('id', $id)
            ->firstOrFail();

        $note->delete();

        return response()->json([
            'message' => 'Note deleted successfully'
        ]);
    }
}