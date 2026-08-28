package pe.ebyzom.lumen.data.local;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000,\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0010 \n\u0002\b\u0002\n\u0002\u0010\t\n\u0002\b\u0004\bg\u0018\u00002\u00020\u0001J\u0019\u0010\u0002\u001a\u00020\u00032\u0006\u0010\u0004\u001a\u00020\u0005H\u00a7@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\u0006J\u0014\u0010\u0007\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00050\t0\bH\'J\u001b\u0010\n\u001a\u0004\u0018\u00010\u00052\u0006\u0010\u000b\u001a\u00020\fH\u00a7@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\rJ\u0019\u0010\u000e\u001a\u00020\u00032\u0006\u0010\u0004\u001a\u00020\u0005H\u00a7@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\u0006J\u0019\u0010\u000f\u001a\u00020\u00032\u0006\u0010\u0004\u001a\u00020\u0005H\u00a7@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\u0006\u0082\u0002\u0004\n\u0002\b\u0019\u00a8\u0006\u0010"}, d2 = {"Lpe/ebyzom/lumen/data/local/ScriptDao;", "", "deleteScript", "", "script", "Lpe/ebyzom/lumen/model/Script;", "(Lpe/ebyzom/lumen/model/Script;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getAllScripts", "Lkotlinx/coroutines/flow/Flow;", "", "getScriptById", "id", "", "(JLkotlin/coroutines/Continuation;)Ljava/lang/Object;", "insertScript", "updateScript", "app_debug"})
@androidx.room.Dao
public abstract interface ScriptDao {
    
    @androidx.room.Query(value = "SELECT * FROM scripts ORDER BY updatedAt DESC")
    @org.jetbrains.annotations.NotNull
    public abstract kotlinx.coroutines.flow.Flow<java.util.List<pe.ebyzom.lumen.model.Script>> getAllScripts();
    
    @androidx.room.Query(value = "SELECT * FROM scripts WHERE id = :id")
    @org.jetbrains.annotations.Nullable
    public abstract java.lang.Object getScriptById(long id, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super pe.ebyzom.lumen.model.Script> $completion);
    
    @androidx.room.Insert(onConflict = 1)
    @org.jetbrains.annotations.Nullable
    public abstract java.lang.Object insertScript(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.model.Script script, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
    
    @androidx.room.Update
    @org.jetbrains.annotations.Nullable
    public abstract java.lang.Object updateScript(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.model.Script script, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
    
    @androidx.room.Delete
    @org.jetbrains.annotations.Nullable
    public abstract java.lang.Object deleteScript(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.model.Script script, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
}